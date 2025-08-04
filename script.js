const visual = document.getElementById('visual');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function factorial(n) {
  const box = document.createElement('div');
  box.className = 'box';
  box.textContent = `factorial(${n}) 호출`;
  visual.appendChild(box);
  await sleep(600);

  if (n === 1) {
    box.textContent = '→ 1 반환';
    box.classList.add('returning');
    await sleep(600);
    return 1;
  }

  const result = await factorial(n - 1);
  const total = n * result;

  box.textContent = `→ ${n} * ${result} = ${total}`;
  box.classList.add('returning');
  await sleep(600);

  return total;
}

async function start() {
  visual.innerHTML = '';
  await factorial(4);
}
