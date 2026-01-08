import { GameState } from "./game";
import { NeuralNetwork } from "./neuralNetwork";

export class Trainer {
    public nn: NeuralNetwork;
    public trainingData: Array<{
        inputs: number[];
        target: number[];
    }> = [];
    private maxSamples = 10000;
    private batchSize = 32;
    public isTraining = false;
    private trainingStats = {
        totalSamples: 0,
        currentLoss: 0,
        trainedEpochs: 0
    };

    // Callbacks
    onStatsUpdate: ((stats: {
        totalSamples: number;
        currentLoss: number;
        trainedEpochs: number;
    }) => void) | null = null;

    constructor(neuralNetwork: NeuralNetwork) {
        this.nn = neuralNetwork;
    }

    addSample(gameState: GameState, optimalAction: number) {
        if (!gameState) {
            throw new Error('Invalid game state for adding sample');
        }
        const sample = {
            inputs: [
                gameState.birdY,
                gameState.birdVelocity,
                gameState.pipeDistance,
                gameState.pipeGapY
            ],
            target: [optimalAction]
        };

        this.trainingData.push(sample);

        // Keep dataset manageable
        if (this.trainingData.length > this.maxSamples) {
            this.trainingData.shift();
        }

        this.trainingStats.totalSamples = this.trainingData.length;
        this.updateStats();
    }

    /**
     * Calculate optimal action based on game state
     * Heuristic: flap if bird is below the gap center
     */
    calculateOptimalAction(gameState: GameState) {
        if (!gameState) {
            throw new Error('Invalid game state for calculating optimal action');
        }
        const birdY = gameState.birdY;
        const gapY = gameState.pipeGapY;
        const velocity = gameState.birdVelocity;

        // Consider velocity - if falling fast and below gap, should flap
        // If above gap and rising, shouldn't flap
        const velocityFactor = (velocity - 0.5) * 0.1;

        // Flap if bird is below the gap center (accounting for velocity)
        return birdY > (gapY - velocityFactor) ? 1 : 0;
    }


    train(learningRate: number = 0.1, epochs: number = 100) {
        if (this.trainingData.length < this.batchSize) {
            console.log('Not enough training data');
            return 0;
        }

        let totalLoss = 0;
        let samplesTrained = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            // Shuffle training data
            const shuffled = this.shuffle([...this.trainingData]);

            // Train on batches
            for (let i = 0; i < shuffled.length; i += this.batchSize) {
                const batch = shuffled.slice(i, i + this.batchSize);

                for (const sample of batch) {
                    const loss = this.nn.train(sample.inputs, sample.target, learningRate);
                    totalLoss += loss;
                    samplesTrained++;
                }
            }
        }

        this.trainingStats.currentLoss = totalLoss / samplesTrained;
        this.trainingStats.trainedEpochs += epochs;
        this.updateStats();

        return this.trainingStats.currentLoss;
    }

    /**
     * Start continuous training mode
     */
    startTraining(learningRate: number, onComplete: (() => void) | null = null) {
        this.isTraining = true;

        const trainStep = () => {
            if (!this.isTraining) {
                if (onComplete) onComplete();
                return;
            }

            // Train for a small number of epochs
            this.train(learningRate, 10);

            // Continue training
            requestAnimationFrame(trainStep);
        };

        trainStep();
    }

    /**
     * Stop continuous training
     */
    stopTraining() {
        this.isTraining = false;
    }

    /**
     * Shuffle array (Fisher-Yates)
     */
    shuffle(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Clear all training data
     */
    reset() {
        this.trainingData = [];
        this.trainingStats = {
            totalSamples: 0,
            currentLoss: 0,
            trainedEpochs: 0
        };
        this.updateStats();
    }

    /**
     * Get training statistics
     */
    getStats() {
        return { ...this.trainingStats };
    }

    /**
     * Update stats callback
     */
    updateStats() {
        if (this.onStatsUpdate) {
            this.onStatsUpdate(this.trainingStats);
        }
    }

    /**
     * Collect training data during gameplay
     * Call this each frame while playing
     */
    collectFromGameState(gameState: GameState) {
        const optimalAction = this.calculateOptimalAction(gameState);
        this.addSample(gameState, optimalAction);
    }
}
