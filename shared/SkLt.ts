// #begin_import
import { randInt } from './SkRd.ts';
// #end_import

export class LootTable<T> {
  constructor(public table: [T, number][]) {}

  expand() {
    const out: T[] = [];
    for (const item of this.table) {
      for (let i = 0; i < item[1]; i++) {
        out.push(item[0]);
      }
    }
    return out;
  }

  totalAmount() {
    let j = 0;
    for (const item of this.table) {
      j += item[1];
    }
    return j;
  }

  random() {
    const rand = randInt(0, this.totalAmount());
    let counter = 0;
    for (const item of this.table) {
      counter += item[1];
      if (counter > rand) {
        return item[0];
      }
    }
    throw new Error('LootTable class index out of bounds');
  }

  randomIndex(): [T, number] {
    const rand = randInt(0, this.totalAmount());
    let counter = 0;
    for (let i = 0; i < this.table.length; i++) {
      const item = this.table[i];
      counter += item[1];
      if (counter > rand) {
        return [item[0], i];
      }
    }
    throw new Error('LootTable class index out of bounds');
  }
}

export class IndexedLootTable<T> {
  constructor(
    public pTable: {
      [id: string]: T & { __weight: number };
    }
  ) {}

  totalAmount() {
    let j = 0;
    for (const id in this.pTable) {
      const item = this.pTable[id];
      j += item.__weight;
    }
    return j;
  }

  random(): T & { __weight: number; __id: string } {
    const rand = randInt(0, this.totalAmount());
    let counter = 0;
    for (const id in this.pTable) {
      const item = this.pTable[id];
      counter += item.__weight;
      if (counter > rand) {
        const d = structuredClone(item) as T & { __weight: number; __id: string };
        d.__id = id;
        return d;
      }
    }
    throw new Error('LootTable class index out of bounds');
  }
}

export class IndexHelper<T, P extends string> {
  constructor(public data: { [key in P]: T }) {}

  get(key: P): () => T {
    return () => this.data[key];
  }

  addItem(key: P, item: T) {
    this.data[key] = item;
  }
}

export class ForcedLootTable<T> extends LootTable<T> {
  force: number;
  constructor(table: [T, number][]) {
    super(table);
    this.force = -1;
  }

  setForce(num: number) {
    this.force = num;
  }

  unForce() {
    this.force = -1;
  }

  override random(): T {
    if (this.force === -1) {
      return super.random();
    } else {
      return this.table[this.force][0];
    }
  }
  override randomIndex(): [T, number] {
    if (this.force === -1) {
      return super.randomIndex();
    } else {
      return [this.table[this.force][0], this.force];
    }
  }
}