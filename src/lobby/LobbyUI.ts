// RIFT Integration - Lobby UI Helper
// Provides UI utilities for lobby management

import { 
  LobbyManager 
} from './LobbyManager';
import { 
  QueueStatus, 
  MatchFoundData, 
  LobbyEventType 
} from './types';

/**
 * Lobby UI Helper - Creates and manages lobby UI elements
 */
export class LobbyUI {
  private lobbyManager: LobbyManager;
  private container: HTMLElement | null = null;
  private isVisible: boolean = false;

  // UI Elements
  private matchFoundPopup: HTMLElement | null = null;

  constructor(lobbyManager: LobbyManager) {
    this.lobbyManager = lobbyManager;
    this.setupEventListeners();
  }

  /**
   * Setup lobby event listeners
   */
  private setupEventListeners(): void {
    this.lobbyManager.on(LobbyEventType.QUEUE_UPDATE, (data) => {
      this.updateQueueDisplay(data as QueueStatus);
    });

    this.lobbyManager.on(LobbyEventType.MATCH_FOUND, (data) => {
      this.showMatchFoundPopup(data as MatchFoundData);
    });

    this.lobbyManager.on(LobbyEventType.MATCH_CANCELLED, () => {
      this.hideMatchFoundPopup();
    });

    this.lobbyManager.on(LobbyEventType.MATCH_STARTING, () => {
      this.hideMatchFoundPopup();
      this.hide();
    });
  }

  /**
   * Initialize lobby UI
   */
  public init(containerId: string = 'lobby-container'): void {
    this.container = document.getElementById(containerId);
    
    if (!this.container) {
      // Create container if it doesn't exist
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }

    this.container.innerHTML = this.getMainTemplate();
    this.setupUIEventHandlers();
  }

  /**
   * Main lobby template
   */
  private getMainTemplate(): string {
    return `
      <div id="lobby-panel" class="lobby-panel">
        <div class="lobby-header">
          <h1>PLAY</h1>
          <button id="lobby-close-btn" class="close-btn">&times;</button>
        </div>
        
        <div class="lobby-content">
          <!-- Category Tabs -->
          <div class="category-tabs" id="category-tabs">
            <button class="category-tab active" data-category="Arena">Arena</button>
            <button class="category-tab" data-category="Competitive">Competitive</button>
            <button class="category-tab" data-category="Casual">Casual</button>
          </div>
          
          <!-- Game Modes Grid -->
          <div class="modes-grid" id="modes-grid">
            ${this.renderGameModes()}
          </div>
        </div>
        
        <!-- Queue Status -->
        <div id="queue-status" class="queue-status hidden">
          <div class="queue-info">
            <span class="queue-text">SEARCHING...</span>
            <span class="queue-time" id="queue-time">0:00</span>
          </div>
          <button id="cancel-queue-btn" class="cancel-btn">CANCEL</button>
        </div>
      </div>
      
      <!-- Match Found Popup -->
      <div id="match-found-popup" class="match-popup hidden">
        <div class="popup-content">
          <h2>MATCH FOUND</h2>
          <div class="match-info" id="match-info"></div>
          <div class="match-timer" id="match-timer">10</div>
          <div class="match-actions">
            <button id="accept-match-btn" class="accept-btn">ACCEPT</button>
            <button id="decline-match-btn" class="decline-btn">DECLINE</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render game modes for current category
   */
  private renderGameModes(category: string = 'Arena'): string {
    const modes = this.lobbyManager.getModesByCategory(category);
    
    if (modes.length === 0) {
      return '<div class="no-modes">No game modes available</div>';
    }

    return modes.map(mode => `
      <div class="mode-card ${mode.enabled ? '' : 'disabled'}" 
           data-mode-id="${mode.id}"
           ${mode.enabled ? '' : 'title="Coming Soon"'}>
        <h3>${mode.name}</h3>
        <p>${mode.description}</p>
        <div class="mode-info">
          <span class="players">${mode.minPlayers}-${mode.maxPlayers} Players</span>
          <span class="wait-time">~${mode.estimatedWaitTime}s wait</span>
        </div>
        ${mode.enabled ? '<div class="play-icon">▶</div>' : '<div class="locked-icon">🔒</div>'}
      </div>
    `).join('');
  }

  /**
   * Setup UI event handlers
   */
  private setupUIEventHandlers(): void {
    if (!this.container) return;

    // Close button
    const closeBtn = this.container.querySelector('#lobby-close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Category tabs
    const tabs = this.container.querySelectorAll('.category-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const category = target.dataset.category;
        if (category) {
          this.switchCategory(category);
        }
      });
    });

    // Mode cards
    this.setupModeCardHandlers();

    // Cancel queue button
    const cancelBtn = this.container.querySelector('#cancel-queue-btn');
    cancelBtn?.addEventListener('click', () => {
      this.lobbyManager.cancelQueue();
      this.hideQueueStatus();
    });

    // Match accept/decline
    const acceptBtn = this.container.querySelector('#accept-match-btn');
    acceptBtn?.addEventListener('click', () => this.lobbyManager.acceptMatch());

    const declineBtn = this.container.querySelector('#decline-match-btn');
    declineBtn?.addEventListener('click', () => this.lobbyManager.declineMatch());
  }

  /**
   * Setup mode card click handlers
   */
  private setupModeCardHandlers(): void {
    const cards = this.container?.querySelectorAll('.mode-card:not(.disabled)');
    cards?.forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const modeId = target.dataset.modeId;
        if (modeId) {
          this.lobbyManager.startQueue(modeId);
          this.showQueueStatus();
        }
      });
    });
  }

  /**
   * Switch game mode category
   */
  private switchCategory(category: string): void {
    // Update tab active states
    const tabs = this.container?.querySelectorAll('.category-tab');
    tabs?.forEach(tab => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.category === category);
    });

    // Re-render modes
    const grid = this.container?.querySelector('#modes-grid');
    if (grid) {
      grid.innerHTML = this.renderGameModes(category);
      this.setupModeCardHandlers();
    }
  }

  /**
   * Show queue status UI
   */
  private showQueueStatus(): void {
    const status = this.container?.querySelector('#queue-status');
    status?.classList.remove('hidden');
    
    // Disable mode cards while in queue
    const cards = this.container?.querySelectorAll('.mode-card');
    cards?.forEach(card => card.classList.add('queued'));
  }

  /**
   * Hide queue status UI
   */
  private hideQueueStatus(): void {
    const status = this.container?.querySelector('#queue-status');
    status?.classList.add('hidden');
    
    // Re-enable mode cards
    const cards = this.container?.querySelectorAll('.mode-card');
    cards?.forEach(card => card.classList.remove('queued'));
  }

  /**
   * Update queue display
   */
  private updateQueueDisplay(status: QueueStatus): void {
    const timeEl = this.container?.querySelector('#queue-time');
    if (timeEl) {
      const mins = Math.floor(status.queueTime / 60);
      const secs = status.queueTime % 60;
      timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Show match found popup
   */
  private showMatchFoundPopup(match: MatchFoundData): void {
    this.hideQueueStatus();
    
    this.matchFoundPopup = this.container?.querySelector('#match-found-popup') as HTMLElement;
    if (!this.matchFoundPopup) return;

    // Show popup
    this.matchFoundPopup.classList.remove('hidden');

    // Update info
    const infoEl = this.matchFoundPopup.querySelector('#match-info');
    const mode = this.lobbyManager.getGameMode(match.modeId);
    if (infoEl && mode) {
      infoEl.textContent = mode.name;
    }

    // Start countdown timer
    let timeLeft = 10;
    const timerEl = this.matchFoundPopup.querySelector('#match-timer');
    
    const countdown = setInterval(() => {
      timeLeft--;
      if (timerEl) timerEl.textContent = timeLeft.toString();
      
      if (timeLeft <= 0) {
        clearInterval(countdown);
        // Auto-decline if time runs out
        this.lobbyManager.declineMatch();
      }
    }, 1000);

    // Store timer reference for cleanup
    (this.matchFoundPopup as { _countdown?: number })._countdown = countdown;
  }

  /**
   * Hide match found popup
   */
  private hideMatchFoundPopup(): void {
    if (!this.matchFoundPopup) return;

    // Clear countdown
    const countdown = (this.matchFoundPopup as { _countdown?: number })._countdown;
    if (countdown) {
      clearInterval(countdown);
    }

    this.matchFoundPopup.classList.add('hidden');
  }

  /**
   * Show lobby UI
   */
  public show(): void {
    this.isVisible = true;
    this.container?.classList.remove('hidden');
    document.body.classList.add('lobby-open');
  }

  /**
   * Hide lobby UI
   */
  public hide(): void {
    this.isVisible = false;
    this.container?.classList.add('hidden');
    document.body.classList.remove('lobby-open');
  }

  /**
   * Toggle lobby visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if lobby is visible
   */
  public isShown(): boolean {
    return this.isVisible;
  }

  /**
   * Dispose of UI
   */
  public dispose(): void {
    this.hideMatchFoundPopup();
    this.container?.remove();
    this.container = null;
  }
}
