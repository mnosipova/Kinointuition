(() => {
  const TOTAL = 10;
  const $ = (s) => document.querySelector(s);
  const screens = {start: $('#startScreen'), game: $('#gameScreen'), final: $('#finalScreen')};
  let state = {deck: [], index: 0, score: 0, answers: [], current: null, locked: false};

  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n));
  const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(1)}`;
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  function show(name) { Object.values(screens).forEach(s => s.classList.remove('active')); screens[name].classList.add('active'); window.scrollTo({top:0, behavior:'smooth'}); }

  function pointsFor(diff) {
    const tenths = Math.round(Math.abs(diff) * 10);
    return tenths <= 9 ? 1000 - tenths * 100 : 0;
  }

  function updateSlider() {
    const v = Number($('#ratingSlider').value);
    $('#guessValue').textContent = v.toFixed(1);
    const pct = ((v - 7) / 3) * 100;
    $('#ratingSlider').style.setProperty('--pct', pct + '%');
  }

  function updateProgress() {
    const r = state.index + 1;
    $('#roundNum').textContent = r;
    $('#liveScore').textContent = fmt(state.score);
    $('#progressFill').style.width = `${(state.index / TOTAL) * 100}%`;
    $('#progressDots').innerHTML = Array.from({length: TOTAL}, (_, i) =>
      `<span class="dot ${i < state.index ? 'done' : ''} ${i === state.index ? 'active' : ''}"></span>`
    ).join('');
  }

  function parseGenre(desc) {
    const m = desc.match(/•\s*([^\s]+(?:\s+[^\s]+)?)/);
    return m ? m[1] : 'сериал';
  }

  function loadRound() {
    state.current = state.deck[state.index];
    state.locked = false;
    updateProgress();
    const s = state.current;
    $('#poster').src = s.image || '';
    $('#poster').alt = s.title;
    $('#title').textContent = s.title;
    $('#years').textContent = s.years || '—';
    $('#genre').textContent = parseGenre(s.description);
    $('#description').textContent = s.description || '';
    $('#cast').textContent = s.cast || '';
    $('#ratingSlider').disabled = false;
    $('#ratingSlider').value = '8.5';
    updateSlider();
    $('#guessBtn').disabled = false;
    $('#guessBtn').textContent = 'УГАДАТЬ';
    $('#result').classList.add('hidden');
  }

  function startGame() {
    state = {deck: shuffle(SERIES_DATA).slice(0, TOTAL), index: 0, score: 0, answers: [], current: null, locked: false};
    show('game');
    loadRound();
  }

  function answer() {
    if (state.locked) return;
    state.locked = true;
    const user = Number($('#ratingSlider').value);
    const real = Number(state.current.rating);
    const diff = +(user - real).toFixed(1);
    const points = pointsFor(diff);
    const abs = Math.abs(diff);
    state.score += points;
    state.answers.push({title: state.current.title, user, real, diff, points});

    $('#ratingSlider').disabled = true;
    $('#guessBtn').disabled = true;
    $('#realRating').textContent = real.toFixed(1);
    $('#userRating').textContent = user.toFixed(1);
    $('#difference').textContent = `Разница: ${signed(diff)}`;
    $('#difference').className = `difference ${abs <= 0.2 ? 'good' : 'bad'}`;
    $('#points').textContent = `+${fmt(points)} баллов`;

    let msg = abs <= 0.1 ? 'Почти идеально! 🎯' : abs <= 0.3 ? 'Очень близко!' : 'Киноинтуиция сегодня подводит 😅';
    $('#resultMessage').textContent = msg;
    $('#explanation').textContent = diff < 0
      ? `Ты поставил ${user.toFixed(1)}, а реальный рейтинг — ${real.toFixed(1)}. Ты недооценил сериал на ${abs.toFixed(1)}.`
      : diff > 0
        ? `Ты поставил ${user.toFixed(1)}, а реальный рейтинг — ${real.toFixed(1)}. Ты переоценил сериал на ${abs.toFixed(1)}.`
        : `Ты попал точно в рейтинг — ${real.toFixed(1)}.`;

    $('#result').classList.remove('hidden');
    $('#nextBtn').textContent = state.index === TOTAL - 1 ? 'ПОКАЗАТЬ РЕЗУЛЬТАТ →' : 'СЛЕДУЮЩИЙ СЕРИАЛ →';
    $('#liveScore').textContent = fmt(state.score);
    setTimeout(() => $('#result').scrollIntoView({behavior:'smooth', block:'nearest'}), 80);
  }

  function finish() {
    const a = state.answers;
    const avg = a.reduce((s,x) => s + Math.abs(x.diff), 0) / TOTAL;
    const over = a.filter(x => x.diff > 0).length;
    const under = a.filter(x => x.diff < 0).length;
    const near = a.filter(x => Math.abs(x.diff) <= 0.1).length;
    const best = Math.min(...a.map(x => Math.abs(x.diff)));
    const worst = Math.max(...a.map(x => Math.abs(x.diff)));
    const pct = Math.round(state.score / 100);

    $('#finalScore').textContent = fmt(state.score);
    $('#intuitionPct').textContent = `${pct}%`;
    $('#avgError').textContent = avg.toFixed(2);
    $('#overCount').textContent = `${over} ${over === 1 ? 'сериал' : 'сериала'}`;
    $('#underCount').textContent = `${under} ${under === 1 ? 'сериал' : 'сериала'}`;
    $('#bestAnswer').textContent = best.toFixed(1);
    $('#worstAnswer').textContent = worst.toFixed(1);
    $('#nearPerfect').textContent = `${near} / 10`;

    let typeName, typeEmoji, typeText;
    if (avg <= 0.2) {
      typeName = 'Кинокритик'; typeEmoji = '🎬';
      typeText = 'Ты удивительно хорошо чувствуешь рейтинги Кинопоиска.';
    } else if (over > under) {
      typeName = 'Оптимист'; typeEmoji = '🍿';
      typeText = `Ты регулярно думаешь, что сериалы лучше, чем считает Кинопоиск. Ты переоценил ${over} из 10 сериалов.`;
    } else if (under > over) {
      typeName = 'Скептик'; typeEmoji = '🧐';
      typeText = `Ты оцениваешь сериалы строже, чем Кинопоиск. Ты недооценил ${under} из 10 сериалов.`;
    } else {
      typeName = 'Балансировщик'; typeEmoji = '⚖️';
      typeText = 'Ты довольно ровно чувствуешь настроение рейтингов Кинопоиска.';
    }
    $('#typeName').textContent = typeName;
    $('#typeEmoji').textContent = typeEmoji;
    $('#typeText').textContent = typeText;

    $('#roundResults').innerHTML = a.map((x,i) => `
      <div class="round-row">
        <span>Раунд ${i+1}</span>
        <div class="bar"><i style="width:${x.points/10}%"></i></div>
        <b>${fmt(x.points)}</b>
      </div>`).join('');
    show('final');
  }

  $('#startBtn').addEventListener('click', startGame);
  $('#ratingSlider').addEventListener('input', updateSlider);
  $('#guessBtn').addEventListener('click', answer);
  $('#nextBtn').addEventListener('click', () => {
    if (state.index === TOTAL - 1) finish();
    else { state.index++; loadRound(); }
  });
  $('#restartBtn').addEventListener('click', startGame);
  $('#homeBtn').addEventListener('click', () => show('start'));
  updateSlider();
})();
