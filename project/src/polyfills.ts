if (typeof Promise === 'undefined') {
  throw new Error(
    'Este navegador no soporta Promise. Por favor, actualiza tu navegador.'
  );
}

if (typeof Object.assign !== 'function') {
  Object.assign = function (target: any, ...sources: any[]) {
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }

    const to = Object(target);

    for (let index = 0; index < sources.length; index++) {
      const nextSource = sources[index];

      if (nextSource != null) {
        for (const nextKey in nextSource) {
          if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
    }
    return to;
  };
}

if (!Array.prototype.includes) {
  Array.prototype.includes = function (searchElement: any, fromIndex?: number): boolean {
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    const o = Object(this);
    const len = o.length >>> 0;

    if (len === 0) {
      return false;
    }

    const n = fromIndex || 0;
    let k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

    while (k < len) {
      if (o[k] === searchElement) {
        return true;
      }
      k++;
    }
    return false;
  };
}

if (!String.prototype.includes) {
  String.prototype.includes = function (search: string, start?: number): boolean {
    if (typeof start === 'undefined') {
      start = 0;
    }
    return this.indexOf(search, start) !== -1;
  };
}

if (!Array.prototype.find) {
  Array.prototype.find = function (predicate: (value: any, index: number, obj: any[]) => boolean): any {
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    const o = Object(this);
    const len = o.length >>> 0;

    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    const thisArg = arguments[1];
    let k = 0;

    while (k < len) {
      const kValue = o[k];
      if (predicate.call(thisArg, kValue, k, o)) {
        return kValue;
      }
      k++;
    }

    return undefined;
  };
}

if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function (predicate: (value: any, index: number, obj: any[]) => boolean): number {
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }

    const o = Object(this);
    const len = o.length >>> 0;

    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    const thisArg = arguments[1];
    let k = 0;

    while (k < len) {
      const kValue = o[k];
      if (predicate.call(thisArg, kValue, k, o)) {
        return k;
      }
      k++;
    }

    return -1;
  };
}

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function (search: string, pos?: number): boolean {
    pos = !pos || pos < 0 ? 0 : +pos;
    return this.substring(pos, pos + search.length) === search;
  };
}

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function (search: string, this_len?: number): boolean {
    if (this_len === undefined || this_len > this.length) {
      this_len = this.length;
    }
    return this.substring(this_len - search.length, this_len) === search;
  };
}

export {};
