// https://gist.github.com/x5ilky/c8d851257e6c0c73fc781b14ab683dcb
import { randInt } from './random';
// Uses lodash to clone objects, implement own if you don't want dependencies
import _ from 'lodash';

export class LootTable<T> {
  constructor(public table: [T, number][]) {}

  expand() {
    let out: T[] = [];
    for (let item of this.table) {
      for (let i = 0; i < item[1]; i++) {
        out.push(item[0]);
      }
    }
    return out;
  }

  totalAmount() {
    let j = 0;
    for (let item of this.table) {
      j += item[1];
    }
    return j;
  }

  random() {
    let rand = randInt(0, this.totalAmount());
    let counter = 0;
    for (let item of this.table) {
      counter += item[1];
      if (counter > rand) {
        return item[0];
      }
    }
    throw new Error('LootTable class index out of bounds');
  }

  randomIndex(): [T, number] {
    let rand = randInt(0, this.totalAmount());
    let counter = 0;
    for (let i = 0; i < this.table.length; i++) {
      let item = this.table[i];
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
    for (let id in this.pTable) {
      let item = this.pTable[id];
      j += item.__weight;
    }
    return j;
  }

  random(): T & { __weight: number; __id: string } {
    let rand = randInt(0, this.totalAmount());
    let counter = 0;
    for (let id in this.pTable) {
      let item = this.pTable[id];
      counter += item.__weight;
      if (counter > rand) {
        let d = _.cloneDeep(item) as any;
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

  random(): T {
    if (this.force === -1) {
      return super.random();
    } else {
      return this.table[this.force][0];
    }
  }
  randomIndex(): [T, number] {
    if (this.force === -1) {
      return super.randomIndex();
    } else {
      return [this.table[this.force][0], this.force];
    }
  }
}