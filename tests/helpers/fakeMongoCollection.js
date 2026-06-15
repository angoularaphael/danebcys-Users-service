/**
 * Fausse collection MongoDB en mémoire — utilisée pour tester les services
 * Mongo (favorites, subscriptions) sans démarrer de vrai serveur Mongo.
 *
 * Implémente la sous-API utilisée par les services :
 *   findOne(filter, { sort? }), find().sort().skip().limit().toArray(),
 *   countDocuments, insertOne, updateOne ($set), updateMany ($set).
 *
 * Les _id sont générés en hex 24-chars compatibles avec `new ObjectId(string)`.
 */

function matches(doc, filter) {
  for (const [key, val] of Object.entries(filter)) {
    if (val && typeof val === 'object' && '$in' in val) {
      if (!val.$in.includes(doc[key])) return false;
    } else if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'ObjectId') {
      if (doc[key]?.toString?.() !== val.toString()) return false;
    } else if (val instanceof Date && doc[key] instanceof Date) {
      if (val.getTime() !== doc[key].getTime()) return false;
    } else if (doc[key] !== val) {
      return false;
    }
  }
  return true;
}

function sortDocs(docs, spec) {
  const entries = Object.entries(spec);
  return [...docs].sort((a, b) => {
    for (const [field, dir] of entries) {
      const av = a[field];
      const bv = b[field];
      if (av === bv) continue;
      const cmp = av > bv ? 1 : -1;
      return cmp * (dir === 1 ? 1 : -1);
    }
    return 0;
  });
}

function createFakeCollection() {
  const docs = [];
  let nextId = 1;

  function makeId() {
    const id = String(nextId++).padStart(24, '0');
    return { toString: () => id, _isFakeId: true };
  }

  return {
    insertOne(doc) {
      const _id = makeId();
      const inserted = { _id, ...doc };
      docs.push(inserted);
      return Promise.resolve({ insertedId: _id });
    },

    findOne(filter, options = {}) {
      let candidates = docs.filter((d) => matches(d, filter));
      if (options.sort) candidates = sortDocs(candidates, options.sort);
      return Promise.resolve(candidates[0] || null);
    },

    find(filter) {
      const filtered = docs.filter((d) => matches(d, filter));
      let sorted = filtered;
      let _skip = 0;
      let _limit = Infinity;

      const cursor = {
        sort(spec) { sorted = sortDocs(filtered, spec); return cursor; },
        skip(n) { _skip = n; return cursor; },
        limit(n) { _limit = n; return cursor; },
        toArray() { return Promise.resolve(sorted.slice(_skip, _skip + _limit)); }
      };
      return cursor;
    },

    countDocuments(filter) {
      return Promise.resolve(docs.filter((d) => matches(d, filter)).length);
    },

    updateOne(filter, update) {
      const doc = docs.find((d) => matches(d, filter));
      if (!doc) return Promise.resolve({ matchedCount: 0, modifiedCount: 0 });
      if (update.$set) Object.assign(doc, update.$set);
      return Promise.resolve({ matchedCount: 1, modifiedCount: 1 });
    },

    updateMany(filter, update) {
      const matched = docs.filter((d) => matches(d, filter));
      for (const doc of matched) {
        if (update.$set) Object.assign(doc, update.$set);
      }
      return Promise.resolve({ matchedCount: matched.length, modifiedCount: matched.length });
    },

    _all: () => docs,
    _reset: () => { docs.length = 0; nextId = 1; }
  };
}

module.exports = { createFakeCollection };
