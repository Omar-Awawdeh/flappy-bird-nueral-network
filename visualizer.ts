import { NeuralNetwork } from './neuralNetwork';

export class Visualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D
    public nn: NeuralNetwork;
    private nodeRadius = 12;
    private layerSpacing = 90;
    private colors = {
        node: '#ecf0f1',
        nodeBorder: '#3498db',
        activeNode: '#2ecc71',
        positiveWeight: '#27ae60',
        negativeWeight: '#c0392b',
        text: '#2c3e50'
    };
    private labels = {
        inputs: ['Bird Y', 'Velocity', 'Dist', 'Gap Y'],
        output: ['Flap']
    };

    constructor(canvas: HTMLCanvasElement, neuralNetwork: NeuralNetwork) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.nn = neuralNetwork;
    }

    draw() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const weights = this.nn.getWeights();
        const activations = this.nn.getActivations();

        // Calculate positions
        const layers = [
            { size: this.nn.inputSize, x: 50 },
            { size: this.nn.hiddenSize, x: width / 2 },
            { size: this.nn.outputSize, x: width - 50 }
        ];

        // Get node positions
        const nodePositions = layers.map((layer) => {
            const positions = [];
            const startY = (height - (layer.size - 1) * 35) / 2;

            for (let i = 0; i < layer.size; i++) {
                positions.push({
                    x: layer.x,
                    y: startY + i * 35
                });
            }
            return positions;
        });

        // Draw connections: Input -> Hidden
        this.drawConnections(
            ctx,
            nodePositions[0],
            nodePositions[1],
            weights.inputToHidden,
            activations.inputs
        );

        // Draw connections: Hidden -> Output
        this.drawConnections(
            ctx,
            nodePositions[1],
            nodePositions[2],
            weights.hiddenToOutput,
            activations.hidden
        );

        // Draw nodes
        this.drawNodes(ctx, nodePositions[0], activations.inputs, this.labels.inputs);
        this.drawNodes(ctx, nodePositions[1], activations.hidden);
        this.drawNodes(ctx, nodePositions[2], activations.output, this.labels.output);

        // Draw layer labels
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.font = '10px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('Input', layers[0].x, height - 5);
        ctx.fillText('Hidden', layers[1].x, height - 5);
        ctx.fillText('Output', layers[2].x, height - 5);
    }

    drawConnections(ctx: CanvasRenderingContext2D, fromNodes: { x: number, y: number }[], toNodes: { x: number, y: number }[], weights: number[][], fromActivations: number[]) {
        for (let i = 0; i < fromNodes.length; i++) {
            for (let j = 0; j < toNodes.length; j++) {
                const weight = weights[i][j];
                const activation = fromActivations[i] || 0;

                // Color based on weight sign
                const intensity = Math.min(Math.abs(weight) * activation, 1);

                if (weight >= 0) {
                    ctx.strokeStyle = `rgba(39, 174, 96, ${0.2 + intensity * 0.6})`;
                } else {
                    ctx.strokeStyle = `rgba(192, 57, 43, ${0.2 + intensity * 0.6})`;
                }

                ctx.lineWidth = 1 + intensity * 2;
                ctx.beginPath();
                ctx.moveTo(fromNodes[i].x, fromNodes[i].y);
                ctx.lineTo(toNodes[j].x, toNodes[j].y);
                ctx.stroke();
            }
        }
    }

    /**
     * Draw nodes for a layer
     */
    drawNodes(ctx: CanvasRenderingContext2D, positions: { x: number, y: number }[], activations: number[], labels: string[] | null = null) {
        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            const activation = activations[i] || 0;

            // Node glow based on activation
            if (activation > 0.1) {
                ctx.shadowColor = this.colors.activeNode;
                ctx.shadowBlur = activation * 15;
            }

            // Node fill
            const gradient = ctx.createRadialGradient(
                pos.x, pos.y, 0,
                pos.x, pos.y, this.nodeRadius
            );
            gradient.addColorStop(0, this.lerpColor('#bdc3c7', '#2ecc71', activation));
            gradient.addColorStop(1, this.colors.node);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, this.nodeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Node border
            ctx.shadowBlur = 0;
            ctx.strokeStyle = this.colors.nodeBorder;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            if (labels && labels[i]) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.font = 'bold 8px Outfit';
                ctx.textAlign = 'left';
                ctx.fillText(labels[i], pos.x - 45, pos.y + 3);
            }
        }
    }

    /**
     * Linear interpolation between two colors
     */
    lerpColor(color1: string, color2: string, t: number): string {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);

        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex: string): { r: number, g: number, b: number } {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
}

