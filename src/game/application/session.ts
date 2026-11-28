import {
  createSimulation,
  stepSimulation,
  type SimulationConfig,
} from '../domain/simulation/simulation';
import type {
  SimulationCommand,
  SimulationEvent,
  SimulationState,
  SimulationStepResult,
} from '../domain/simulation/types';

const FIXED_STEP_SECONDS = 1 / 60;
const MAX_CATCH_UP_STEPS = 5;

export type SessionListener = (state: SimulationState, events: readonly SimulationEvent[]) => void;

export class GameSession {
  private state: SimulationState;

  private readonly config: SimulationConfig;

  private readonly listeners = new Set<SessionListener>();

  private readonly queuedCommands: SimulationCommand[] = [];

  private animationFrame: number | null = null;

  private lastFrameTime: number | null = null;

  private accumulatedSeconds = 0;

  private visibilityHandler: (() => void) | null = null;

  public constructor(config: SimulationConfig) {
    this.config = config;
    this.state = createSimulation(config);
  }

  public getState(): SimulationState {
    return this.state;
  }

  public subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public dispatch(...commands: readonly SimulationCommand[]): void {
    this.queuedCommands.push(...commands);
  }

  public advanceTicks(count: number): SimulationStepResult {
    let result: SimulationStepResult = { state: this.state, events: [] };
    for (let index = 0; index < count; index += 1) {
      result = this.advanceOneTick();
    }
    return result;
  }

  public start(): void {
    if (this.animationFrame !== null || typeof window === 'undefined') {
      return;
    }
    this.visibilityHandler = () => {
      if (document.hidden && this.state.mode === 'running') {
        this.dispatch({ type: 'pause' });
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.animationFrame = window.requestAnimationFrame((time) => this.frame(time));
  }

  public dispose(): void {
    if (this.animationFrame !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrame);
    }
    this.animationFrame = null;
    if (this.visibilityHandler !== null) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.visibilityHandler = null;
    this.listeners.clear();
    this.queuedCommands.length = 0;
  }

  public reset(): void {
    this.state = createSimulation(this.config);
    this.accumulatedSeconds = 0;
    this.lastFrameTime = null;
    this.emit([]);
  }

  private frame(time: number): void {
    if (this.lastFrameTime === null) {
      this.lastFrameTime = time;
    }
    const elapsed = Math.min((time - this.lastFrameTime) / 1000, 0.25);
    this.lastFrameTime = time;
    this.accumulatedSeconds += elapsed;
    let catchUpSteps = 0;
    while (this.accumulatedSeconds >= FIXED_STEP_SECONDS && catchUpSteps < MAX_CATCH_UP_STEPS) {
      this.advanceOneTick();
      this.accumulatedSeconds -= FIXED_STEP_SECONDS;
      catchUpSteps += 1;
    }
    if (catchUpSteps === MAX_CATCH_UP_STEPS) {
      this.accumulatedSeconds = 0;
    }
    this.animationFrame = window.requestAnimationFrame((nextTime) => this.frame(nextTime));
  }

  private advanceOneTick(): SimulationStepResult {
    const commands = this.queuedCommands.splice(0, this.queuedCommands.length);
    const result = stepSimulation(this.state, commands);
    this.state = result.state;
    this.emit(result.events);
    return result;
  }

  private emit(events: readonly SimulationEvent[]): void {
    for (const listener of this.listeners) {
      listener(this.state, events);
    }
  }
}
