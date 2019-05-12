const ITEM_WIDTH = 32;

class BoxGame {
  constructor({container, levels, onload, onLevelComplete}) {
    this.container = container;
    this.levels = levels;
    this.onload = onload;
    this.onLevelComplete = onLevelComplete;
  }

  moveTo(item, x, y) {
    item.x = x;
    item.y = y;
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

  getItem(x, y) {
    const items = this.container.children;
    for(let i = 0; i < items.length; i++) {
      const item = items[i];
      if(x === item.x && y === item.y && item.className !== 'spot') {
        return item;
      }
    }
    return null;
  }

  moveItem(item, direction = 'right') {
    let from,
      to,
      prop;
    if(direction === 'left' || direction === 'right') {
      from = item.x;
      to = direction === 'left' ? from - 1 : from + 1;
      prop = 'left';
    } else {
      from = item.y;
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
          if(prop === 'left') that.moveTo(item, to, item.y);
          else that.moveTo(item, item.x, to);
          resolve();
        }
      });
    });
  }

  async move(direction = 'right') {
    const boxman = this.boxman;
    const x = boxman.x,
      y = boxman.y;

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
        && (direction === 'left' && !this.getItem(x - 2, y)
        || direction === 'right' && !this.getItem(x + 2, y)
        || direction === 'up' && !this.getItem(x, y - 2)
        || direction === 'down' && !this.getItem(x, y + 2))) {
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

  isAtSpot(bucket) {
    const spots = this.container.querySelectorAll('.spot');
    for(let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      if(bucket.x === spot.x && bucket.y === spot.y) {
        return true;
      }
    }
    return false;
  }

  isWin() {
    // 检查是否箱子都在spot中
    const buckets = this.container.querySelectorAll('.bucket');
    return Array.from(buckets).every(bucket => this.isAtSpot(bucket));
  }

  waitCommand() {
    return new Promise((resolve) => {
      if(this._command) {
        window.removeEventListener('keydown', this._command);
      }
      this._command = (event) => {
        window.removeEventListener('keydown', this._command);
        const keyCode = event.code.slice(5).toLowerCase();
        if(keyCode === 'left'
          || keyCode === 'up'
          || keyCode === 'right'
          || keyCode === 'down') {
          resolve(keyCode);
        } else {
          resolve(null);
        }
      };
      window.addEventListener('keydown', this._command);
    });
  }

  initLevel(level) {
    this.container.innerHTML = '';

    const {trees, spots, buckets, man} = this.levels[level - 1];

    function parseData(dataStr) {
      return dataStr.split('|').map(o => o.split(',').map(Number));
    }

    parseData(trees).forEach(([x, y]) => this.addItem('tree', x, y));
    parseData(spots).forEach(([x, y]) => this.addItem('spot', x, y));
    parseData(buckets).forEach(([x, y]) => this.addItem('bucket', x, y));

    this.addItem('boxman', ...man.split(',').map(Number));
  }

  async load(level) {
    const levels = this.levels;

    if(level <= 0) level = levels.length;
    else if(Number.isNaN(level) || level > levels.length) level = 1;
    this.level = level;

    this.initLevel(level);

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

const LEVELS = [
  {
    trees: '4,7|5,7|6,7|7,7|8,7|9,7|10,7|4,6|10,6|4,5|10,5|4,4|10,4|4,3|5,3|6,3|7,3|8,3|9,3|10,3',
    buckets: '8,6|6,5|8,5|6,4',
    spots: '5,6|9,6|5,4|9,4',
    man: '7,5',
  }, {
    trees: '3,2|4,2|5,2|6,2|7,2|8,2|9,2|10,2|3,3|7,3|10,3|3,4|10,4|3,5|7,5|10,5|3,6|4,6|5,6|6,6|7,6|8,6|9,6|10,6',
    buckets: '7,4',
    spots: '9,4',
    man: '8,4',
  }, {
    trees: '6,2|7,2|8,2|9,2|4,3|5,3|6,3|9,3|4,4|9,4|10,4|4,5|10,5|4,6|6,6|10,6|4,7|5,7|6,7|7,7|8,7|9,7|10,7',
    buckets: '6,4|6,5',
    spots: '8,4|7,6',
    man: '5,6',
  },
];

const app = new BoxGame({
  levels: LEVELS,
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
