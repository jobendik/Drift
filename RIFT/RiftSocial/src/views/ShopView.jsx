import React, { useEffect, useState } from 'react';
import { SectionHeader } from '../components/ui/SectionHeader';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ShopView = () => {
    const { token, user, login } = useAuth(); // We might need to refresh user data after purchase
    const [items, setItems] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [purchaseStatus, setPurchaseStatus] = useState(null); // { type: 'success' | 'error', message: '' }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [shopItems, userInventory] = await Promise.all([
                    api.getShopItems(),
                    token ? api.getInventory(token) : Promise.resolve([])
                ]);
                setItems(shopItems);
                setInventory(userInventory);
            } catch (error) {
                console.error('Failed to fetch shop data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const handleBuy = async (itemId) => {
        if (!token) return;
        setPurchaseStatus(null);

        try {
            await api.buyItem(token, itemId);
            setPurchaseStatus({ type: 'success', message: 'Purchase successful!' });

            // Refresh inventory and user data (for currency)
            const updatedInventory = await api.getInventory(token);
            setInventory(updatedInventory);

            // Hacky way to refresh user balance without full page reload
            // Ideally AuthContext would expose a refreshUser method
            // window.location.reload(); 
        } catch (error) {
            setPurchaseStatus({ type: 'error', message: error.message });
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading shop...</div>;

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Item Shop" subtitle="Upgrade your arsenal" />

            {/* Balance Display */}
            <div className="mb-6 p-4 bg-slate-900/50 border border-slate-800 rounded-sm flex justify-between items-center">
                <span className="text-slate-400">Your Balance</span>
                <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-cyan-400">{user?.currency?.riftTokens || 0}</span>
                    <span className="text-xs uppercase tracking-widest text-slate-500">Rift Tokens</span>
                </div>
            </div>

            {/* Status Message */}
            {purchaseStatus && (
                <div className={`mb-6 p-3 rounded-sm text-sm border ${purchaseStatus.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'
                    }`}>
                    {purchaseStatus.message}
                </div>
            )}

            {/* Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(item => {
                    const ownedItem = inventory.find(i => i.itemId === item.id);
                    const isOwned = !!ownedItem;

                    return (
                        <div key={item.id} className="bg-[#0A0A0A] border border-slate-800 p-4 rounded-sm hover:border-slate-600 transition-colors group relative overflow-hidden">
                            {/* Type Badge */}
                            <div className="absolute top-2 right-2 text-[10px] font-mono uppercase tracking-widest text-slate-600 bg-slate-900 px-2 py-1 rounded">
                                {item.type}
                            </div>

                            <div className="mt-4 mb-2">
                                <h3 className="text-lg font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{item.name}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2 h-10">{item.description}</p>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="font-mono text-cyan-400">
                                    {item.price} <span className="text-xs text-slate-600">RT</span>
                                </div>

                                <button
                                    onClick={() => handleBuy(item.id)}
                                    disabled={!token || (item.type !== 'CONSUMABLE' && isOwned)}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all
                                        ${!token ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                                            item.type !== 'CONSUMABLE' && isOwned
                                                ? 'bg-green-900/20 text-green-500 border border-green-900 cursor-default'
                                                : 'bg-cyan-600 hover:bg-cyan-500 text-white hover:shadow-[0_0_15px_rgba(8,145,178,0.5)]'
                                        }
                                    `}
                                >
                                    {item.type !== 'CONSUMABLE' && isOwned ? 'OWNED' : 'BUY'}
                                </button>
                            </div>

                            {isOwned && item.type === 'CONSUMABLE' && (
                                <div className="mt-2 text-xs text-right text-slate-500">
                                    Owned: {ownedItem.quantity}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
