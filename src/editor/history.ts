import type { AnnotationItem } from '../shared/types';

export function cloneAnnotationList(items: AnnotationItem[]): AnnotationItem[] {
  return items.map((item) => ({ ...item }));
}

/**
 * Immutable undo history stack (`historyStack`) for vector annotations in `editor.html`.
 */
export class UndoHistoryStack {
  private snapshots: AnnotationItem[][] = [];

  constructor(initialSnapshots: AnnotationItem[][] = []) {
    this.snapshots = initialSnapshots.map((snap) => cloneAnnotationList(snap));
  }

  public pushSnapshot(currentItems: AnnotationItem[]): void {
    this.snapshots.push(cloneAnnotationList(currentItems));
  }

  public undo(): AnnotationItem[] | null {
    const previous = this.snapshots.pop();
    if (!previous) {
      return null;
    }
    return cloneAnnotationList(previous);
  }

  public canUndo(): boolean {
    return this.snapshots.length > 0;
  }

  public size(): number {
    return this.snapshots.length;
  }

  public getSnapshots(): AnnotationItem[][] {
    return this.snapshots.map((snap) => cloneAnnotationList(snap));
  }

  public reset(initialSnapshots: AnnotationItem[][] = []): void {
    this.snapshots = initialSnapshots.map((snap) => cloneAnnotationList(snap));
  }
}
