class Bird {
    public x: number;
    public y: number;
    public velocity: number;
    public alive: boolean;
    public height: number;

    private width: number;
    private gravity: number;
    private flapForce: number;
    private rotation: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.width = 34;
        this.height = 24;
        this.gravity = 0.6;
        this.velocity = 0;
        this.flapForce = -8;
        this.rotation = 0;
        this.alive = true;
    }

    flap() {
        if (this.alive) this.velocity = this.flapForce;
    }

    update() {
        if (!this.alive) return;

        // Apply gravity
        this.velocity += this.gravity;
        this.velocity = Math.min(this.velocity, 12); // Terminal velocity
        this.y += this.velocity;

        // Update rotation based on velocity
        this.rotation = Math.min(Math.max(this.velocity * 3, -30), 90);
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate((Math.PI / 180) * this.rotation);

        // Body
        ctx.fillStyle = "#ffdd00";
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(8, -4, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(10, -4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = "#ff6600";
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(22, 3);
        ctx.lineTo(15, 6);
        ctx.closePath();
        ctx.fill();

        // Wing
        ctx.fillStyle = "#ffaa00";
        ctx.beginPath();
        ctx.ellipse(-5, 4, 10, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.x + 4,
            y: this.y + 4,
            width: this.width - 8,
            height: this.height - 8,
        };
    }
}

class Pipe {
    x: number;
    width: number;
    gapY: number;
    gapHeight: number;
    canvasHeight: number;
    speed: number;
    passed: boolean;

    constructor(
        x: number,
        gapY: number,
        gapHeight: number,
        canvasHeight: number
    ) {
        this.x = x;
        this.width = 60;
        this.gapY = gapY;
        this.gapHeight = gapHeight;
        this.canvasHeight = canvasHeight;
        this.speed = 3;
        this.passed = false;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx: CanvasRenderingContext2D) {
        const pipeGradient = ctx.createLinearGradient(
            this.x,
            0,
            this.x + this.width,
            0
        );
        pipeGradient.addColorStop(0, "#00aa44");
        pipeGradient.addColorStop(0.5, "#00ff66");
        pipeGradient.addColorStop(1, "#00aa44");

        // Top pipe
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(this.x, 0, this.width, this.gapY);

        // Top pipe cap
        ctx.fillStyle = "#00cc55";
        ctx.fillRect(this.x - 4, this.gapY - 25, this.width + 8, 25);
        ctx.strokeStyle = "#008833";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x - 4, this.gapY - 25, this.width + 8, 25);

        // Bottom pipe
        ctx.fillStyle = pipeGradient;
        const bottomY = this.gapY + this.gapHeight;
        ctx.fillRect(this.x, bottomY, this.width, this.canvasHeight - bottomY);

        // Bottom pipe cap
        ctx.fillStyle = "#00cc55";
        ctx.fillRect(this.x - 4, bottomY, this.width + 8, 25);
        ctx.strokeStyle = "#008833";
        ctx.strokeRect(this.x - 4, bottomY, this.width + 8, 25);
    }

    getGapCenter() {
        return this.gapY + this.gapHeight / 2;
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }

    checkCollision(bird: Bird) {
        const b = bird.getBounds();

        // Check collision with top pipe
        if (
            b.x < this.x + this.width &&
            b.x + b.width > this.x &&
            b.y < this.gapY
        ) {
            return true;
        }

        // Check collision with bottom pipe
        const bottomY = this.gapY + this.gapHeight;
        if (
            b.x < this.x + this.width &&
            b.x + b.width > this.x &&
            b.y + b.height > bottomY
        ) {
            return true;
        }

        return false;
    }
}

export type GameState = ReturnType<Game['getGameState']>;

export class Game {
    public bestScore = 0
    public gameState: "idle" | "playing" | "gameover" = 'idle';

    private ctx: CanvasRenderingContext2D | null;
    private width: number;
    private height: number;
    private bird: Bird | null = null;
    private pipes: Pipe[] = []
    private score: number = 0;
    private frameCount: number = 0;
    private pipeSpawnInterval: number = 100;
    private gapHeight: number = 150;
    private groundY: number;

    // Callbacks
    onScore: ((score: number) => void) | null = null;
    onGameOver: ((score: number) => void) | null = null;
    onStateCapture: ((state: any) => void) | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.ctx = canvas.getContext("2d");
        this.width = canvas.width;
        this.height = canvas.height;

        this.groundY = this.height - 50;
    }

    reset() {
        this.bird = new Bird(80, this.height / 2);
        this.pipes = [];
        this.score = 0;
        this.frameCount = 0;
        this.gameState = "idle";
    }

    start() {
        this.reset();
        this.gameState = "playing";
        this.spawnPipes();
    }

    spawnPipes() {
        const minGapY = 80;
        const maxGapY = this.groundY - this.gapHeight - 80;
        const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
        this.pipes.push(new Pipe(this.width, gapY, this.gapHeight, this.height));
    }

    flap() {
        if (this.gameState === "playing") {
            this.bird?.flap();
        }
    }

    gameOver() {
        if (this.bird === null) return;
        this.gameState = 'gameover';
        this.bird.alive = false;
        if (this.onGameOver) this.onGameOver(this.score);
    }


    update() {
        if (this.gameState !== "playing" || !this.bird) return;

        this.frameCount++;
        this.bird.update();

        // Check ground/ceiling collision
        if (this.bird.y + this.bird.height > this.groundY || this.bird.y < 0) {
            this.gameOver();
            return;
        }
        // Update pipes
        for (const pipe of this.pipes) {
            pipe.update();

            if (pipe.checkCollision(this.bird)) {
                this.gameOver();
                return;
            }

            // Check if bird passed the pipe
            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                if (this.score > this.bestScore) {
                    this.bestScore = this.score;
                }
                if (this.onScore) this.onScore(this.score);
            }

            // Remove off-screen pipes
            if (pipe.isOffScreen()) {
                this.pipes.shift();
            }
        }

        // Spawn new pipes
        if (this.frameCount % this.pipeSpawnInterval === 0) {
            this.spawnPipes();
        }

        if (this.onStateCapture) {
            this.onStateCapture(this.getGameState());
        }
    }

    getGameState() {
        if (!this.bird) return null;
        const nextPipe = this.pipes.find(pipe => pipe.x + pipe.width > this.bird!.x);
        const normalizedY = this.bird.y / this.height;
        const normalizedVelocity = (this.bird.velocity + 15) / 30;
        const normalizedDistance = nextPipe ? (nextPipe.x - this.bird.x) / this.width : 1;
        const normalizedPipeGapY = nextPipe ? nextPipe.getGapCenter() / this.height : 0.5;

        return {
            birdY: normalizedY,
            birdVelocity: normalizedVelocity,
            pipeDistance: normalizedDistance,
            pipeGapY: normalizedPipeGapY,
        };
    }

    isPlaying() {
        return this.gameState === "playing";
    }

    isGameOver() {
        return this.gameState === "gameover";
    }

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;

        // Background gradient
        const bgGradient = ctx.createLinearGradient(0, 0, 0, this.height);
        bgGradient.addColorStop(0, '#1a1a3e');
        bgGradient.addColorStop(0.5, '#12122a');
        bgGradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = "#87CEEB";
        ctx.fillRect(0, 0, this.width, this.height);

        // Stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 97) % this.width;
            const y = (i * 53) % (this.height - 100);
            const size = (i % 3) + 1;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Ground
        ctx.fillStyle = '#53a600ff';
        ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.lineTo(this.width, this.groundY);
        ctx.stroke();

        // Draw pipes
        for (const pipe of this.pipes) {
            pipe.draw(ctx);
        }

        // Draw bird
        this.bird?.draw(ctx);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText(this.score.toString(), this.width / 2, 70);

    }
}   
