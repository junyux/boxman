const BOUND_X = 15;
const BOUND_Y = 10;
const ITEM_WIDTH = 32;
const MAX_LEVEL = 113;

class BoxGame {
  constructor({container, onload, onLevelComplete}) {
    this.container = container;
    this.onload = onload;
    this.onLevelComplete = onLevelComplete;
  }

  moveTo(item, x, y) {
    item.dataset.x = x;
    item.dataset.y = y;
    item.style.left = `${x * ITEM_WIDTH}px`;
    item.style.top = `${y * ITEM_WIDTH}px`;
  }

  addItem(type, x, y) {
    const item = document.createElement('i');
    item.className = type;

    if(type === 'boxman') {
      item.className += ' down';
    }

    this.moveTo(item, x, y);
    this.container.appendChild(item);
  }

  get boxman() {
    return this.container.querySelector('.boxman');
  }

  getXY(item) {
    return [Number(item.dataset.x), Number(item.dataset.y)];
  }

  getItem(x, y) {
    const items = this.container.children;
    for(let i = 0; i < items.length; i++) {
      const item = items[i];
      if(x === Number(item.dataset.x) && y === Number(item.dataset.y) && item.className !== 'spot') {
        return item;
      }
    }
    return null;
  }

  getSpot(x, y) {
    const items = this.container.querySelectorAll('.spot');
    for(let i = 0; i < items.length; i++) {
      const item = items[i];
      if(x === Number(item.dataset.x) && y === Number(item.dataset.y)) {
        return item;
      }
    }
    return null;
  }

  isOutOfBound(x, y) {
    return x < 0 || y < 0 || x >= BOUND_X || y >= BOUND_Y;
  }

  isEmpty(x, y) {
    return !this.isOutOfBound(x, y) && !this.getItem(x, y);
  }

  isAtSpot(bucket) {
    const spots = this.container.querySelectorAll('.spot');
    for(let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      if(bucket.dataset.x === spot.dataset.x && bucket.dataset.y === spot.dataset.y) {
        return true;
      }
    }
    return false;
  }

  async move(direction = 'right') {
    const boxman = this.boxman;
    const x = Number(boxman.dataset.x),
      y = Number(boxman.dataset.y);

    let item = null;

    if(direction === 'left') {
      item = this.getItem(x - 1, y);
    } else if(direction === 'right') {
      item = this.getItem(x + 1, y);
    } else if(direction === 'up') {
      item = this.getItem(x, y - 1);
    } else if(direction === 'down') {
      item = this.getItem(x, y + 1);
    }

    if(!item) {
      boxman.className = `boxman ${direction} walk`;
      await this.moveItem(boxman, direction);
      boxman.className = `boxman ${direction}`;
    } else if(item.className === 'bucket'
        && (direction === 'left' && this.isEmpty(x - 2, y)
        || direction === 'right' && this.isEmpty(x + 2, y)
        || direction === 'up' && this.isEmpty(x, y - 2)
        || direction === 'down' && this.isEmpty(x, y + 2))) {
      boxman.className = `boxman ${direction} walk`;
      await Promise.all([
        this.moveItem(boxman, direction),
        this.moveItem(item, direction),
      ]);
      boxman.className = `boxman ${direction}`;
    } else {
      boxman.className = `boxman ${direction}`;
    }
  }

  moveItem(item, direction = 'right') {
    let from,
      to,
      prop;
    if(direction === 'left' || direction === 'right') {
      from = Number(item.dataset.x);
      to = direction === 'left' ? from - 1 : from + 1;
      prop = 'left';
    } else {
      from = Number(item.dataset.y);
      to = direction === 'up' ? from - 1 : from + 1;
      prop = 'top';
    }

    return new Promise((resolve) => {
      const startTime = Date.now();
      const that = this;
      requestAnimationFrame(function update() {
        const p = Math.min(1.0, (Date.now() - startTime) / 200);
        item.style[prop] = `${ITEM_WIDTH * ((1 - p) * from + p * to)}px`;
        if(p < 1.0) {
          requestAnimationFrame(update);
        } else {
          if(prop === 'left') that.moveTo(item, to, item.dataset.y);
          else that.moveTo(item, item.dataset.x, to);
          resolve();
        }
      });
    });
  }

  isWin() {
    // 检查是否箱子都在spot中
    const buckets = this.container.querySelectorAll('.bucket');
    return Array.from(buckets).every(bucket => this.isAtSpot(bucket));
  }

  waitCommand() {
    return new Promise((resolve) => {
      if(this._command) window.removeEventListener('keydown', this._command);
      this._command = (event) => {
        const keyCode = event.keyCode;
        switch (keyCode) {
          case 37:
            resolve('left');
            break;
          case 38:
            resolve('up');
            break;
          case 39:
            resolve('right');
            break;
          case 40:
            resolve('down');
            break;
          default:
            resolve(null);
            break;
        }
      };
      window.addEventListener('keydown', this._command, {once: true});
    });
  }

  clear() {
    this.container.innerHTML = '';
  }

  init({trees, spots, buckets, man}) {
    this.clear();
    trees.forEach(([x, y]) => this.addItem('tree', x, y));
    spots.forEach(([x, y]) => this.addItem('spot', x, y));
    buckets.forEach(([x, y]) => this.addItem('bucket', x, y));
    this.addItem('boxman', ...man);
  }

  async load(level) {
    if(level <= 0) level = MAX_LEVEL;
    else if(Number.isNaN(level) || level > MAX_LEVEL) level = 1;
    this.level = level;

    const {trees, spots, buckets, man} = getData(level);

    this.init({trees, spots, buckets, man});

    if(this.onload) {
      this.onload(level);
    }

    /* eslint-disable no-await-in-loop */
    do {
      const direction = await this.waitCommand();
      if(direction) {
        await this.move(direction);
      }
    } while(!this.isWin());
    /* eslint-enable no-await-in-loop */

    if(this.onLevelComplete) {
      await this.onLevelComplete(level);
    }
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const currentLevel = document.getElementById('currentlevel');
const previousLevel = document.getElementById('previouslevel');
const nextLevel = document.getElementById('nextlevel');
const reset = document.getElementById('reset');

const playLevel = Number(localStorage.getItem('playlevel')) || 1;

const app = new BoxGame({
  container: document.getElementById('boxmap'),
  onload(level) {
    currentLevel.value = level;
  },
  async onLevelComplete(level) {
    localStorage.setItem('playlevel', level + 1);
    const result = document.getElementById('game-result');
    result.className = 'show';
    await wait(1300);
    result.className = '';
    await wait(200);
    this.load(level + 1);
  },
});

app.load(playLevel);

currentLevel.addEventListener('change', ({target}) => {
  app.load(Number(target.value));
});

previousLevel.addEventListener('click', () => {
  app.load(app.level - 1);
});

nextLevel.addEventListener('click', () => {
  app.load(app.level + 1);
});

reset.addEventListener('click', () => {
  app.load(app.level);
});
