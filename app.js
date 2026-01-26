/**
 * Hexa - A Simple Hexagonal Puzzle Game
 * Single Page Application
 */

class HexaApp {
    constructor() {
        this.currentScreen = 'home';
        this.screens = {};
        this.selectedTheme = 0;
        this.init();
    }

    init() {
        // Cache screen elements
        document.querySelectorAll('.screen').forEach(screen => {
            const id = screen.id.replace('-screen', '');
            this.screens[id] = screen;
        });

        // Setup navigation
        this.setupNavigation();

        // Load saved stats
        this.loadStats();

        // Load saved theme
        this.loadTheme();

        console.log('Hexa App initialized');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('hexaTheme');
        if (savedTheme !== null) {
            this.selectTheme(parseInt(savedTheme));
        }
    }

    setupNavigation() {
        // Menu items navigation
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const targetScreen = item.dataset.screen;
                if (targetScreen) {
                    this.navigateTo(targetScreen);
                }
            });
        });

        // Back buttons
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetScreen = btn.dataset.screen;
                if (targetScreen) {
                    this.navigateTo(targetScreen);
                }
            });
        });

        // More screen tabs
        document.querySelectorAll('.more-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchMoreTab(tab.dataset.tab);
            });
        });

        // Theme options
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectTheme(parseInt(option.dataset.theme));
            });
        });

        // Handle browser back button
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.screen) {
                this.navigateTo(event.state.screen, false);
            } else {
                this.navigateTo('home', false);
            }
        });

        // Set initial state
        history.replaceState({ screen: 'home' }, '', '');
    }

    switchMoreTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.more-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            const isSettings = content.id === 'settings-tab' && tabName === 'settings';
            const isAbout = content.id === 'about-tab' && tabName === 'about';
            content.classList.toggle('active', isSettings || isAbout);
        });
    }

    selectTheme(themeIndex) {
        this.selectedTheme = themeIndex;

        // Update theme options UI
        document.querySelectorAll('.theme-option').forEach((option, index) => {
            const isSelected = index === themeIndex;
            option.classList.toggle('selected', isSelected);
            option.querySelector('.theme-radio').classList.toggle('selected', isSelected);
        });

        // Save theme preference
        localStorage.setItem('hexaTheme', themeIndex);

        // Update game colors based on theme
        this.updateGameColors();
    }

    updateGameColors() {
        const themes = [
            ['#F7931E', '#8CC63F', '#29ABE2', '#7B8CDE'], // Theme 0 - Default
            ['#F5A623', '#7ED4D1', '#EC8C99', '#8FD47E'], // Theme 1
            ['#6B9370', '#B5D4A1', '#A8CEE2', '#D4C89E'], // Theme 2
            ['#2D3436', '#4A5F8C', '#B8C5E0', '#F4E63D']  // Theme 3
        ];

        const colorNames = ['orange', 'green', 'blue', 'purple'];
        const themeColors = themes[this.selectedTheme] || themes[0];

        // Update CSS variables for game colors
        const root = document.documentElement;
        colorNames.forEach((name, index) => {
            root.style.setProperty(`--hex-${name}`, themeColors[index]);
        });

        // If game state exists, update the color mapping
        if (this.gameState) {
            this.gameState.themeColors = themeColors;
        }
    }

    navigateTo(screenName, pushState = true) {
        // Hide current screen
        if (this.screens[this.currentScreen]) {
            this.screens[this.currentScreen].classList.remove('active');
        }

        // Show target screen
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
            this.currentScreen = screenName;

            // Update browser history
            if (pushState) {
                history.pushState({ screen: screenName }, '', `#${screenName}`);
            }

            // Trigger screen-specific initialization
            this.onScreenEnter(screenName);
        }
    }

    onScreenEnter(screenName) {
        switch (screenName) {
            case 'stats':
                this.updateStatsDisplay();
                break;
            case 'play':
                this.initGame();
                break;
            case 'tutorial':
                // Could animate tutorial steps here
                break;
        }
    }

    // ==================
    // GAME LOGIC
    // ==================

    initGame() {
        this.gameState = {
            time: 18,
            score: 0,
            targetPattern: [],
            currentPattern: [],
            powerUps: {
                time: 5,
                skips: 5,
                thaws: 0
            },
            colors: ['orange', 'green', 'blue', 'purple'],
            isRunning: true
        };

        // Clear any existing timer
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }

        // Setup game board click handlers
        this.setupGameBoard();

        // Setup power-up handlers
        this.setupPowerUps();

        // Generate first pattern
        this.generateNewPattern();

        // Start timer
        this.startGameTimer();

        // Update display
        this.updateGameDisplay();
    }

    setupGameBoard() {
        const hexCells = document.querySelectorAll('.hex-cell');
        hexCells.forEach(cell => {
            // Remove old listeners by cloning
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
            
            newCell.addEventListener('click', () => {
                if (!this.gameState.isRunning) return;
                
                const index = parseInt(newCell.dataset.index);
                this.handleHexClick(index, newCell);
            });
        });
    }

    setupPowerUps() {
        const powerUps = document.querySelectorAll('.power-up');
        powerUps.forEach(pu => {
            const newPu = pu.cloneNode(true);
            pu.parentNode.replaceChild(newPu, pu);
            
            newPu.addEventListener('click', () => {
                const type = newPu.dataset.type;
                this.usePowerUp(type);
            });
        });
    }

    generateNewPattern() {
        // Pick a random hex to be the target (0-6)
        const targetIndex = Math.floor(Math.random() * 7);
        this.gameState.targetPattern = targetIndex;

        // Randomize board colors
        const hexCells = document.querySelectorAll('.hex-cell');
        hexCells.forEach(cell => {
            const randomColor = this.gameState.colors[Math.floor(Math.random() * this.gameState.colors.length)];
            cell.dataset.color = randomColor;
            cell.classList.remove('selected', 'frozen');
        });

        // Update pattern indicator
        this.updatePatternIndicator();
    }

    updatePatternIndicator() {
        // Reset all pattern hexes
        for (let i = 0; i < 7; i++) {
            const patternHex = document.getElementById(`pattern-${i}`);
            if (patternHex) {
                patternHex.classList.remove('active');
                patternHex.setAttribute('fill', 'none');
                patternHex.setAttribute('stroke', '#333');
            }
        }

        // Highlight the target hex
        const targetHex = document.getElementById(`pattern-${this.gameState.targetPattern}`);
        if (targetHex) {
            targetHex.classList.add('active');
            targetHex.setAttribute('fill', '#29ABE2');
            targetHex.setAttribute('stroke', '#29ABE2');
        }
    }

    handleHexClick(index, cell) {
        // Check if this is the correct hex
        if (index === this.gameState.targetPattern) {
            // Correct!
            this.gameState.score += 10;
            this.gameState.time += 2; // Bonus time for correct answer
            
            // Visual feedback
            cell.classList.add('selected');
            setTimeout(() => {
                this.generateNewPattern();
            }, 200);
        } else {
            // Wrong - lose time
            this.gameState.time -= 2;
            
            // Visual feedback - shake
            cell.style.animation = 'shake 0.3s ease';
            setTimeout(() => {
                cell.style.animation = '';
            }, 300);

            if (this.gameState.time <= 0) {
                this.endGame();
            }
        }

        this.updateGameDisplay();
    }

    startGameTimer() {
        this.gameTimer = setInterval(() => {
            if (this.gameState.isRunning && this.gameState.time > 0) {
                this.gameState.time--;
                this.updateGameDisplay();

                if (this.gameState.time <= 0) {
                    this.endGame();
                }
            }
        }, 1000);
    }

    usePowerUp(type) {
        switch (type) {
            case 'time':
                if (this.gameState.powerUps.time > 0) {
                    this.gameState.powerUps.time--;
                    this.gameState.time += 10;
                    this.updateGameDisplay();
                }
                break;
            case 'skip':
                if (this.gameState.powerUps.skips > 0) {
                    this.gameState.powerUps.skips--;
                    this.generateNewPattern();
                    this.updateGameDisplay();
                }
                break;
            case 'thaw':
                if (this.gameState.powerUps.thaws > 0) {
                    this.gameState.powerUps.thaws--;
                    // Thaw removes frozen state from all hexes
                    document.querySelectorAll('.hex-cell.frozen').forEach(cell => {
                        cell.classList.remove('frozen');
                    });
                    this.updateGameDisplay();
                }
                break;
        }
    }

    updateGameDisplay() {
        document.getElementById('game-time').textContent = this.gameState.time;
        document.getElementById('game-score').textContent = this.gameState.score;
        document.getElementById('power-time').textContent = this.gameState.powerUps.time;
        document.getElementById('power-skips').textContent = this.gameState.powerUps.skips;
        document.getElementById('power-thaws').textContent = this.gameState.powerUps.thaws;

        // Update power-up disabled states
        document.querySelectorAll('.power-up').forEach(pu => {
            const type = pu.dataset.type;
            const count = type === 'time' ? this.gameState.powerUps.time :
                          type === 'skip' ? this.gameState.powerUps.skips :
                          this.gameState.powerUps.thaws;
            pu.classList.toggle('disabled', count === 0);
        });
    }

    endGame() {
        this.gameState.isRunning = false;
        clearInterval(this.gameTimer);

        // Record stats
        this.recordGameEnd(this.gameState.score, this.gameState.score > 0);

        // Show game over
        setTimeout(() => {
            alert(`Game Over!\n\nFinal Score: ${this.gameState.score}\n\nTap the back button to return home.`);
        }, 100);
    }

    // Stats Management
    loadStats() {
        const defaultStats = {
            gamesPlayed: 0,
            highScore: 0,
            totalScore: 0,
            wins: 0,
            bestTime: null,
            currentStreak: 0
        };

        const savedStats = localStorage.getItem('hexaStats');
        this.stats = savedStats ? JSON.parse(savedStats) : defaultStats;
    }

    saveStats() {
        localStorage.setItem('hexaStats', JSON.stringify(this.stats));
    }

    updateStatsDisplay() {
        const statCards = document.querySelectorAll('.stat-card');
        
        const statsData = [
            this.stats.gamesPlayed,
            this.stats.highScore,
            this.stats.totalScore,
            this.stats.gamesPlayed > 0 
                ? Math.round((this.stats.wins / this.stats.gamesPlayed) * 100) + '%' 
                : '0%',
            this.stats.bestTime 
                ? this.formatTime(this.stats.bestTime) 
                : '--:--',
            this.stats.currentStreak
        ];

        statCards.forEach((card, index) => {
            const valueEl = card.querySelector('.stat-value');
            if (valueEl && statsData[index] !== undefined) {
                valueEl.textContent = statsData[index];
            }
        });
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Game stats update methods (for future game implementation)
    recordGameEnd(score, won, timeInSeconds = null) {
        this.stats.gamesPlayed++;
        this.stats.totalScore += score;
        
        if (score > this.stats.highScore) {
            this.stats.highScore = score;
        }
        
        if (won) {
            this.stats.wins++;
            this.stats.currentStreak++;
            
            if (timeInSeconds && (!this.stats.bestTime || timeInSeconds < this.stats.bestTime)) {
                this.stats.bestTime = timeInSeconds;
            }
        } else {
            this.stats.currentStreak = 0;
        }
        
        this.saveStats();
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.hexaApp = new HexaApp();
});

// Handle initial hash navigation
window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'home' && window.hexaApp.screens[hash]) {
        window.hexaApp.navigateTo(hash, false);
    }
});
