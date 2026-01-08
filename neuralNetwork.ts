import { Game, GameState } from "./game";

export class NeuralNetwork {
    public inputSize: number;
    public hiddenSize: number
    public outputSize: number;

    private weightsIH: number[][]; // Weights from Input to Hidden layer
    private weightsHO: number[][]; // Weights from Hidden to Output layer

    private biasH: number[]; // Biases for Hidden layer
    private biasO: number[]; // Biases for Output layer

    // Store last activations for backpropagation
    private lastInputs: number[] | null;
    private lastHidden: number[] | null;
    private lastOutput: number[] | null;

    constructor(inputSize = 4, hiddenSize = 8, outputSize = 1) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.outputSize = outputSize;

        // Initialize weights with Xavier initialization
        this.weightsIH = this.initializeWeights(inputSize, hiddenSize);
        this.weightsHO = this.initializeWeights(hiddenSize, outputSize);

        // Initialize biases
        this.biasH = new Array(hiddenSize).fill(0);
        this.biasO = new Array(outputSize).fill(0);

        // Store activations for backpropagation
        this.lastInputs = null;
        this.lastHidden = null;
        this.lastOutput = null;
    }

    initializeWeights(rows: number, cols: number) {
        const weights: number[][] = [];

        for (let i = 0; i < rows; i++) {
            weights[i] = [];
            for (let j = 0; j < cols; j++) {
                weights[i][j] = Math.random() * 2 - 1;
            }
        }
        return weights;
    }

    sigmoid(x: number): number {
        return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
    }

    sigmoidDerivative(x: number): number {
        return x * (1 - x);
    }

    forwardPass(inputs: number[]): number[] {
        if (inputs.length !== this.inputSize) {
            throw new Error(`Expected ${this.inputSize} inputs, got ${inputs.length}`);
        }

        this.lastInputs = [...inputs];

        // Input to Hidden
        this.lastHidden = [];
        for (let h = 0; h < this.hiddenSize; h++) {
            let sum = this.biasH[h];
            for (let i = 0; i < this.inputSize; i++) {
                sum += inputs[i] * this.weightsIH[i][h];
            }
            this.lastHidden[h] = this.sigmoid(sum);
        }

        // Hidden to Output
        this.lastOutput = [];
        for (let o = 0; o < this.outputSize; o++) {
            let sum = this.biasO[o];
            for (let h = 0; h < this.hiddenSize; h++) {
                sum += this.lastHidden[h] * this.weightsHO[h][o];
            }
            this.lastOutput[o] = this.sigmoid(sum);
        }

        return this.lastOutput;
    }

    /**
     * Backpropagation training step
     * @param {Array} inputs - Input values
     * @param {Array} targets - Expected output values
     * @param {number} learningRate - Learning rate (default 0.1)
     * @returns {number} - Mean squared error
     */
    train(inputs: number[], targets: number[], learningRate: number = 0.1): number {
        // Forward pass
        const outputs = this.forwardPass(inputs);

        // Calculate output layer errors
        const outputErrors: number[] = [];
        let mse = 0;
        for (let o = 0; o < this.outputSize; o++) {
            const error = targets[o] - outputs[o];
            outputErrors[o] = error * this.sigmoidDerivative(outputs[o]);
            mse += error * error;
        }
        mse /= this.outputSize;

        // Calculate hidden layer errors
        const hiddenErrors = [];
        for (let h = 0; h < this.hiddenSize; h++) {
            let error = 0;
            for (let o = 0; o < this.outputSize; o++) {
                error += outputErrors[o] * this.weightsHO[h][o];
            }
            hiddenErrors[h] = error * this.sigmoidDerivative(this.lastHidden![h]);
        }

        // Update weights: Hidden -> Output
        for (let h = 0; h < this.hiddenSize; h++) {
            for (let o = 0; o < this.outputSize; o++) {
                this.weightsHO[h][o] += learningRate * outputErrors[o] * this.lastHidden![h];
            }
        }

        // Update biases: Output
        for (let o = 0; o < this.outputSize; o++) {
            this.biasO[o] += learningRate * outputErrors[o];
        }

        // Update weights: Input -> Hidden
        for (let i = 0; i < this.inputSize; i++) {
            for (let h = 0; h < this.hiddenSize; h++) {
                this.weightsIH[i][h] += learningRate * hiddenErrors[h] * this.lastInputs![i];
            }
        }

        // Update biases: Hidden
        for (let h = 0; h < this.hiddenSize; h++) {
            this.biasH[h] += learningRate * hiddenErrors[h];
        }

        return mse;
    }

    /**
     * Predict whether to flap
     * @param {Object} gameState - Normalized game state
     * @returns {boolean} - True if should flap
     */
    predict(gameState: GameState): boolean {
        if (!gameState) {
            throw new Error('Invalid game state for prediction');
        }
        const inputs = [
            gameState.birdY,
            gameState.birdVelocity,
            gameState.pipeDistance,
            gameState.pipeGapY
        ];
        const output = this.forwardPass(inputs);
        return output[0] > 0.5;
    }

    /**
     * Get network weights for visualization
     */
    getWeights() {
        return {
            inputToHidden: this.weightsIH,
            hiddenToOutput: this.weightsHO,
            biasHidden: this.biasH,
            biasOutput: this.biasO
        };
    }

    /**
     * Get last activations for visualization
     */
    getActivations() {
        return {
            inputs: this.lastInputs || new Array(this.inputSize).fill(0),
            hidden: this.lastHidden || new Array(this.hiddenSize).fill(0),
            output: this.lastOutput || new Array(this.outputSize).fill(0)
        };
    }

    /**
     * Copy the network
     */
    copy() {
        const nn = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);

        // Deep copy weights
        for (let i = 0; i < this.inputSize; i++) {
            for (let h = 0; h < this.hiddenSize; h++) {
                nn.weightsIH[i][h] = this.weightsIH[i][h];
            }
        }
        for (let h = 0; h < this.hiddenSize; h++) {
            for (let o = 0; o < this.outputSize; o++) {
                nn.weightsHO[h][o] = this.weightsHO[h][o];
            }
        }

        nn.biasH = [...this.biasH];
        nn.biasO = [...this.biasO];

        return nn;
    }



    /**
     * Export weights as JSON
     */
    toJSON() {
        return JSON.stringify({
            weightsIH: this.weightsIH,
            weightsHO: this.weightsHO,
            biasH: this.biasH,
            biasO: this.biasO
        });
    }

    /**
     * Import weights from JSON
     */
    fromJSON(json: string) {
        const data = JSON.parse(json);
        this.weightsIH = data.weightsIH;
        this.weightsHO = data.weightsHO;
        this.biasH = data.biasH;
        this.biasO = data.biasO;
    }
}
