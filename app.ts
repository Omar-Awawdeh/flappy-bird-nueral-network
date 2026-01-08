import { Game } from "./game";
import { NeuralNetwork } from "./neuralNetwork";
import { Trainer } from "./trainer";
import { Visualizer } from "./visualizer";

declare global {
    interface Window {
        app: App;
    }
}

export class App {
    private gameCanvas: HTMLCanvasElement;
    private game: Game
    private mode: 'idle' | 'playing' | 'training' | 'ai' = 'idle';
    private nn: NeuralNetwork;
    public trainer: Trainer;
    private visualizer: Visualizer;

    private nnCanvas: HTMLCanvasElement;

    // Stats elements
    private scoreValue: HTMLElement;
    private bestScore: HTMLElement;
    private sampleCount: HTMLElement;
    private lossValue: HTMLElement;
    private epochsValue: HTMLElement;

    // Control elements
    private playBtn: HTMLButtonElement;
    private trainBtn: HTMLButtonElement;
    private watchBtn: HTMLButtonElement;
    private resetBtn: HTMLButtonElement;
    private learningRateSlider: HTMLInputElement;
    private lrValue: HTMLElement;

    constructor() {
        // Dom Elements
        // Get DOM elements
        this.gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.nnCanvas = document.getElementById('nnCanvas') as HTMLCanvasElement;

        // Stats elements
        this.scoreValue = document.getElementById('scoreValue') as HTMLElement;
        this.bestScore = document.getElementById('bestScore') as HTMLElement;
        this.sampleCount = document.getElementById('sampleCount') as HTMLElement;
        this.lossValue = document.getElementById('lossValue') as HTMLElement;
        this.epochsValue = document.getElementById('epochsValue') as HTMLElement;

        // Control elements
        this.playBtn = document.getElementById('playBtn') as HTMLButtonElement;
        this.trainBtn = document.getElementById('trainBtn') as HTMLButtonElement;
        this.watchBtn = document.getElementById('watchBtn') as HTMLButtonElement;
        this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
        this.learningRateSlider = document.getElementById('learningRate') as HTMLInputElement;
        this.lrValue = document.getElementById('lrValue') as HTMLElement;

        // Components
        this.game = new Game(this.gameCanvas);
        this.nn = new NeuralNetwork(4, 8, 1);
        this.trainer = new Trainer(this.nn);
        this.visualizer = new Visualizer(this.nnCanvas, this.nn);

        this.setupEventListeners();
        this.setupCallbacks();
        this.render();
    }

    setupEventListeners() {
        // Button clicks
        this.playBtn.addEventListener('click', () => this.startPlaying());
        this.trainBtn.addEventListener('click', () => this.toggleTraining());
        this.watchBtn.addEventListener('click', () => this.startAI());
        this.resetBtn.addEventListener('click', () => this.reset());

        // Learning rate slider
        this.learningRateSlider.addEventListener('input', (e) => {
            this.lrValue.textContent = (e.target as HTMLInputElement).value;
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleFlap();
            }
        });

        // Mouse/touch controls
        this.gameCanvas.addEventListener('click', () => this.handleFlap());
    }


    setupCallbacks() {
        // Game callbacks
        this.game.onScore = (score) => {
            this.scoreValue.textContent = String(score);
            this.bestScore.textContent = String(this.game.bestScore);
        };

        this.game.onGameOver = (score) => {
            // this.showOverlay('Game Over!', `Score: ${score} | Click Play to try again`);
            this.mode = 'idle';
            this.playBtn.textContent = 'Play Again';
        };

        this.game.onStateCapture = (state) => {
            if (this.mode === 'playing') {
                // Collect training data while playing
                this.trainer.collectFromGameState(state);
            }
        };

        // Trainer callbacks
        this.trainer.onStatsUpdate = (stats) => {
            this.sampleCount.textContent = String(stats.totalSamples);
            if (stats.currentLoss > 0) {
                this.lossValue.textContent = stats.currentLoss.toFixed(4);
            }
            this.epochsValue.textContent = String(stats.trainedEpochs);

            // Enable AI button when we have enough data
            if (stats.totalSamples >= 100) {
                this.watchBtn.disabled = false;
            }
        };
    }

    handleFlap() {
        if (this.mode === 'idle' && this.game.gameState !== 'playing') {
            this.startPlaying();
        } else if (this.mode === 'playing') {
            this.game.flap();
        }
    }

    startPlaying() {
        this.mode = 'playing';
        this.game.start();
        this.playBtn.textContent = 'Playing...';
        this.playBtn.disabled = true;

        setTimeout(() => {
            this.playBtn.disabled = false;
            this.playBtn.textContent = 'Play Again';
        }, 1000);
    }

    toggleTraining() {
        if (this.trainer.isTraining) {
            this.stopTraining();
        } else {
            this.startTraining();
        }
    }

    startTraining() {
        if (this.trainer.trainingData.length < 32) {
            return;
        }

        this.mode = 'training';
        this.trainBtn.textContent = 'Stop Training';
        this.trainBtn.classList.add('training');
        document.body.classList.add('training');

        const learningRate = parseFloat(this.learningRateSlider.value);
        this.trainer.startTraining(learningRate);
    }

    stopTraining() {
        this.mode = 'idle';
        this.trainer.stopTraining();
        this.trainBtn.textContent = 'Train AI';
        this.trainBtn.classList.remove('training');
        document.body.classList.remove('training');
    }

    startAI() {
        this.mode = 'ai';
        this.game.start();
        this.watchBtn.textContent = 'Stop AI';

        // AI game loop
        const aiLoop = () => {
            if (this.mode !== 'ai' || this.game.gameState !== 'playing') {
                this.watchBtn.textContent = 'Watch AI';
                return;
            }

            const state = this.game.getGameState();
            const shouldFlap = this.nn.predict(state);

            if (shouldFlap) {
                this.game.flap();
            }

            requestAnimationFrame(aiLoop);
        };

        aiLoop();
    }

    reset() {
        this.mode = 'idle';
        this.game.reset();
        this.trainer.reset();
        this.nn = new NeuralNetwork(4, 8, 1);
        this.trainer.nn = this.nn;
        this.visualizer.nn = this.nn;

        this.scoreValue.textContent = '0';
        this.sampleCount.textContent = '0';
        this.lossValue.textContent = '-';
        this.epochsValue.textContent = '0';
        this.watchBtn.disabled = true;
        this.playBtn.textContent = 'Play Game';
        this.trainBtn.textContent = 'Train AI';
    }

    render() {
        this.game.update();
        this.game.draw();

        this.visualizer.draw();

        requestAnimationFrame(() => this.render());
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.app = new App();
});
