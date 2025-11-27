import React, { useState, useEffect } from 'react';
import { ScriptConfig } from '../types';
import { Copy, Check, Terminal, Users, Eye } from 'lucide-react';

const ScriptGenerator: React.FC = () => {
  const [config, setConfig] = useState<ScriptConfig>({
    mode: 'viewers', // 'viewers' or 'contacts'
    scrollStep: 300, // Уменьшено до 300 для точности (1600 было слишком быстро)
    scrollDelay: 1500, // Увеличено время ожидания прогрузки
    filterTime: true,
    filterKeywords: ['Сегодня', 'Вчера', 'Today', 'Yesterday'],
    autoCopy: true,
    autoDownload: false,
  });

  const [generatedCode, setGeneratedCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const keywordsString = config.filterKeywords.map(k => `'${k}'`).join(', ');
    const isViewersMode = config.mode === 'viewers';
    const targetName = isViewersMode ? 'Зрители Статуса' : 'Все Контакты';
    
    // Логика поиска правильного контейнера и селекторы
    const strategyLogic = isViewersMode 
      ? `
        // --- РЕЖИМ 1: ЗРИТЕЛИ СТАТУСА ---
        // Ищем модальное окно (обычно справа)
        const root = document.querySelector('div[role="dialog"]') || document.querySelector('span[data-icon="x-viewer"]')?.closest('div[role="dialog"]');
        if (!root) throw new Error('Окно списка зрителей не найдено! Откройте список глазком.');
        
        scrollContainer = findScrollable(root);
        
        // Селектор строки контакта внутри списка
        rowSelector = 'div[role="listitem"], div[role="button"]';
      ` 
      : `
        // --- РЕЖИМ 2: ВСЕ КОНТАКТЫ (НОВЫЙ ЧАТ) ---
        // СТРАТЕГИЯ "СНИЗУ-ВВЕРХ": Ищем строку контакта, потом её родителя.
        
        // 1. Ищем любой элемент, похожий на контакт (role=listitem)
        let anchor = document.querySelector('div[role="listitem"]');
        
        // Если не нашли по role, ищем по специфичным классам или структуре (часто в WA)
        if (!anchor) {
             // Ищем элемент с высотой 72px (стандарт WA для контакта)
             const candidates = document.querySelectorAll('div[style*="height: 72px"]');
             if (candidates.length > 0) anchor = candidates[0];
        }

        // Если все равно нет, пробуем найти текст "Новая группа" или "New group" (он всегда есть в начале списка)
        if (!anchor) {
             const xpath = "//*[text()='Новая группа' or text()='New group']";
             const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
             if (res.singleNodeValue) anchor = res.singleNodeValue;
        }

        // Если не нашли якорь, ищем "Back" button, который часто в хедере панели
        if (!anchor) {
             const backBtn = document.querySelector('span[data-icon="back"]');
             if (backBtn) {
                 // Панель - это соседний контейнер или родитель
                 const drawer = backBtn.closest('header')?.nextElementSibling;
                 if (drawer) scrollContainer = findScrollable(drawer);
             }
        }

        if (!scrollContainer) {
             if (!anchor) throw new Error('Не могу найти панель контактов. Откройте панель "Новый чат" заново.');
             console.log('Якорь найден:', anchor);

             // 2. Поднимаемся вверх от якоря, пока не найдем скроллящийся контейнер
             let current = anchor.parentElement;
             while (current && current !== document.body) {
                  const style = window.getComputedStyle(current);
                  const overflowY = style.overflowY;
                  // WhatsApp часто использует overflow-y: auto или scroll
                  if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && current.scrollHeight > current.clientHeight) {
                      scrollContainer = current;
                      break;
                  }
                  current = current.parentElement;
             }
        }

        if (!scrollContainer) {
             // Fallback: пробуем найти по ID панели, если знаем (он меняется, но все же)
             console.warn('Не удалось определить скролл через подъем. Пробую найти самый глубокий скролл на странице.');
             const allScrolls = Array.from(document.querySelectorAll('div')).filter(div => {
                 const s = window.getComputedStyle(div);
                 return (s.overflowY === 'auto' || s.overflowY === 'scroll') && div.scrollHeight > 100;
             });
             // Обычно нужный нам скролл - это тот, что "выше" (больше z-index) или последний в DOM
             if (allScrolls.length > 0) scrollContainer = allScrolls[allScrolls.length - 1];
        }

        if (!scrollContainer) throw new Error('Не удалось найти контейнер прокрутки. Пожалуйста, прокрутите список контактов немного вручную и запустите скрипт снова.');
        
        console.log('Контейнер прокрутки найден:', scrollContainer);
        rowSelector = 'div[role="listitem"]'; 
      `;

    const extractionLogic = isViewersMode
      ? `
        // Логика для ЗРИТЕЛЕЙ:
        const titleEl = row.querySelector('span[title]');
        if (titleEl) return titleEl.getAttribute('title');

        const textEls = row.querySelectorAll('span[dir="auto"]');
        if (textEls.length > 0) return textEls[0].innerText;
      `
      : `
        // Логика для ВСЕХ КОНТАКТОВ:
        
        // 1. Приоритет: span[title] (самый точный для имен)
        if (row.tagName === 'SPAN' && row.hasAttribute('title')) {
             return row.getAttribute('title');
        }
        
        const titleEl = row.querySelector('span[title]');
        if (titleEl) {
           const name = titleEl.getAttribute('title');
           // Игнорируем заголовки разделов
           if (['Контакты в WhatsApp', 'Часто используемые', 'Все контакты', 'Бизнесы', 'Другие контакты', 'Contacts on WhatsApp', 'Frequently contacted'].includes(name)) return null;
           return name;
        }

        // 2. Fallback: span[dir="auto"] (текст)
        const textNodes = Array.from(row.querySelectorAll('span[dir="auto"]'));
        for (let node of textNodes) {
            const txt = node.innerText;
            if (txt && txt.length > 1 && !txt.includes(':') && !txt.match(/был\(а\)/)) {
                return txt;
            }
        }
        
        return null; 
      `;

    const code = `
(async () => {
  console.clear();
  console.log('%c 🚀 StatusLens: Запуск (${targetName})... ', 'background: #22c55e; color: #fff; padding: 4px; border-radius: 4px; font-weight: bold;');
  
  // Хелпер для поиска скролла
  function findScrollable(parent) {
      if (!parent) return null;
      // Сначала проверяем сам элемент
      const pStyle = window.getComputedStyle(parent);
      if ((pStyle.overflowY === 'auto' || pStyle.overflowY === 'scroll' || pStyle.overflowY === 'overlay') && parent.scrollHeight > parent.clientHeight) {
          return parent;
      }
      // Затем детей
      const allDivs = parent.querySelectorAll('div');
      for (let el of allDivs) {
          const style = window.getComputedStyle(el);
          if ((style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') && el.scrollHeight > el.clientHeight) {
               return el;
          }
      }
      return null;
  }

  try {
    let scrollContainer = null;
    let rowSelector = '';
    
    ${strategyLogic}
    
    console.log('%c ✅ Список найден. Начинаю сканирование... ', 'color: #22c55e');

    const delay = ms => new Promise(res => setTimeout(res, ms));

    const CONFIG = {
      scrollStep: ${config.scrollStep}, // Меньший шаг для точности
      delayMs: ${config.scrollDelay}, // Большая задержка для подгрузки
      maxStableTries: 10,
      filterKeywords: [${keywordsString}],
    };

    let namesSet = new Set();
    let stableCount = 0;
    let totalFound = 0;
    
    // Сброс скролла в начало
    scrollContainer.scrollTop = 0;
    await delay(1000);

    while (stableCount < CONFIG.maxStableTries) {
      // --- СБОР ДАННЫХ (Сначала собираем, потом скроллим) ---
      let elements = [];
      let strategy = 'none';
      
      // 1. Основной поиск по селектору (role=listitem)
      if (rowSelector) {
          const rows = scrollContainer.querySelectorAll(rowSelector);
          if (rows.length > 0) {
              elements = Array.from(rows);
              strategy = 'rows';
          }
      }
      
      // 2. Fallback: Прямой поиск span[title]
      if (elements.length === 0) {
          const titleSpans = scrollContainer.querySelectorAll('span[title]');
          if (titleSpans.length > 0) {
              elements = Array.from(titleSpans);
              strategy = 'spans';
              if (stableCount === 0) console.log('ℹ Использую стратегию: поиск по span[title]');
          }
      }
      
      // 3. Fallback: Текстовые узлы (крайний случай)
      if (elements.length === 0) {
           elements = Array.from(scrollContainer.querySelectorAll('span[dir="auto"]'));
           strategy = 'text';
           if (stableCount === 0) console.log('ℹ Использую стратегию: поиск по тексту');
      }

      let foundOnThisStep = 0;
      elements.forEach(row => {
          const name = (() => {
             try {
                ${extractionLogic}
             } catch (e) { return null; }
             return null;
          })();

          if (name) {
             const cleanName = name.trim();
             // Фильтр мусора
             if (cleanName.length > 0 && !namesSet.has(cleanName)) {
                // Доп фильтры
                const isSystem = ['Новая группа', 'Новое сообщество', 'New group', 'New community'].some(s => cleanName.includes(s));
                // Фильтр времени (00:00) и дат
                const isTime = /^\\d{1,2}:\\d{2}$/.test(cleanName); 
                const isStatus = ['в сети', 'online', 'печатает', 'typing'].includes(cleanName.toLowerCase());
                
                if (!isSystem && !isTime && !isStatus) {
                    namesSet.add(cleanName);
                    foundOnThisStep++;
                }
             }
          }
      });

      totalFound = namesSet.size;

      // --- ПРОКРУТКА ---
      const currentScroll = scrollContainer.scrollTop;
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      
      // Скроллим
      scrollContainer.scrollBy(0, CONFIG.scrollStep);
      await delay(CONFIG.delayMs);

      // --- ПРОВЕРКА ЗАВЕРШЕНИЯ ---
      // Если уперлись в дно или скролл не двигается
      if (Math.abs(scrollContainer.scrollTop - currentScroll) < 1 || Math.abs(scrollContainer.scrollTop - maxScroll) < 5) {
         stableCount++;
         console.log(\`⏳ Конец списка или пауза (\${stableCount}/\${CONFIG.maxStableTries})\`);
      } else {
         if (foundOnThisStep === 0 && totalFound > 0) {
             stableCount++; 
         } else {
             stableCount = 0; 
             if (foundOnThisStep > 0) console.log(\`⚡ Найдено всего: \${totalFound} (+\${foundOnThisStep})\`);
         }
      }
    }

    console.log('🏁 Сканирование завершено.');

    // Финальная очистка
    const filteredList = [...namesSet].filter(name => {
      if (CONFIG.filterKeywords.some(kw => name.includes(kw))) return false;
      return true;
    });

    const resultString = filteredList.join('\\n');

    console.log(\`%c 🎉 ИТОГ: \${filteredList.length} контактов \`, 'background: #22c55e; color: #fff; font-size: 16px; padding: 6px;');
    
    // --- UI ДЛЯ ГАРАНТИРОВАННОГО КОПИРОВАНИЯ ---
    // Создаем кнопку прямо в интерфейсе WhatsApp, чтобы юзер мог нажать ее.
    // Это обходит все ограничения браузера на "авто-копирование".
    
    const existingBtn = document.getElementById('sl-copy-btn');
    if (existingBtn) existingBtn.remove();

    const btn = document.createElement('button');
    btn.id = 'sl-copy-btn';
    btn.innerHTML = \`📋 Нажмите, чтобы скопировать <b>\${filteredList.length}</b> контактов\`;
    
    // Стили кнопки
    Object.assign(btn.style, {
        position: 'fixed',
        top: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '999999',
        padding: '16px 32px',
        backgroundColor: '#22c55e',
        color: 'white',
        border: 'none',
        borderRadius: '50px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        fontSize: '18px',
        fontFamily: 'system-ui, sans-serif',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    });

    // Ховер эффект
    btn.onmouseenter = () => btn.style.transform = 'translateX(-50%) scale(1.05)';
    btn.onmouseleave = () => btn.style.transform = 'translateX(-50%) scale(1)';

    btn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(resultString);
            btn.innerHTML = '✅ Успешно скопировано!';
            btn.style.backgroundColor = '#15803d'; // Темно-зеленый
            console.log('✅ Данные скопированы в буфер обмена.');
            
            // Удаляем кнопку через 3 секунды
            setTimeout(() => {
                btn.style.opacity = '0';
                setTimeout(() => btn.remove(), 500);
            }, 3000);
        } catch (err) {
            console.error('Ошибка копирования:', err);
            prompt('Авто-копирование не сработало. Скопируйте вручную:', resultString);
        }
    };

    document.body.appendChild(btn);
    console.log('%c 🟢 Кнопка для копирования добавлена на экран WhatsApp! ', 'color: #22c55e; font-weight: bold; font-size: 14px;');

    ${config.autoDownload ? `
    if (resultString.length > 0) {
        const blob = new Blob([resultString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '${isViewersMode ? 'status_viewers' : 'all_contacts'}_' + new Date().toISOString().slice(0,10) + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    ` : ''}
    
    if (filteredList.length === 0) {
        alert('Контакты не найдены.\\n1. Проверьте, что список открыт.\\n2. Попробуйте прокрутить его немного вручную.');
    }

  } catch (e) {
    console.error('❌ Ошибка StatusLens:', e);
    alert('Ошибка: ' + e.message);
  }
})();
    `;
    setGeneratedCode(code.trim());
  }, [config]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-6 h-6 text-whatsapp-500" />
          Шаг 1: Получение Списков
        </h2>
        <div className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700">
          Вставьте код в консоль (F12)
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Settings Column */}
        <div className="space-y-4">
          
          <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-600 mb-4">
            <h3 className="text-sm font-bold text-white mb-3">Что сканируем?</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setConfig({...config, mode: 'viewers'})}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${config.mode === 'viewers' ? 'bg-whatsapp-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                <Eye className="w-4 h-4" />
                Зрители
              </button>
              <button 
                onClick={() => setConfig({...config, mode: 'contacts'})}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${config.mode === 'contacts' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                <Users className="w-4 h-4" />
                Все Контакты
              </button>
            </div>
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/20 rounded text-xs text-blue-200">
               <strong>Инструкция:</strong>
               {config.mode === 'viewers' ? (
                 <ol className="list-decimal ml-4 mt-1 space-y-1 text-slate-400">
                   <li>Откройте статус в WhatsApp Web.</li>
                   <li>Нажмите список зрителей (иконка глаза).</li>
                   <li>Вставьте код.</li>
                 </ol>
               ) : (
                 <ol className="list-decimal ml-4 mt-1 space-y-1 text-slate-400">
                   <li>Нажмите "Новый чат" (иконка 💬 сверху).</li>
                   <li>Убедитесь, что список контактов открылся слева.</li>
                   <li>Вставьте код.</li>
                 </ol>
               )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Опции</h3>
            <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition group">
              <span className="text-slate-200 text-sm group-hover:text-white transition">Показать кнопку копирования</span>
              <input 
                type="checkbox" 
                checked={config.autoCopy} 
                onChange={e => setConfig({...config, autoCopy: e.target.checked})}
                className="w-4 h-4 accent-whatsapp-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition group">
              <span className="text-slate-200 text-sm group-hover:text-white transition">Сохранять в файл (.txt)</span>
              <input 
                type="checkbox" 
                checked={config.autoDownload} 
                onChange={e => setConfig({...config, autoDownload: e.target.checked})}
                className="w-4 h-4 accent-whatsapp-500"
              />
            </label>
            <div className="pt-2">
               <label className="text-xs text-slate-400 block mb-1">Скорость скролла (px/шаг)</label>
               <input 
                  type="range" 
                  min="100" 
                  max="1000" 
                  step="50"
                  value={config.scrollStep}
                  onChange={(e) => setConfig({...config, scrollStep: parseInt(e.target.value)})}
                  className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-whatsapp-500"
               />
               <div className="flex justify-between text-xs text-slate-500 mt-1">
                 <span>Точно (100)</span>
                 <span className="text-white font-mono">{config.scrollStep}px</span>
                 <span>Быстро (1000)</span>
               </div>
               <p className="text-[10px] text-slate-500 mt-1">
                 Рекомендуется 300-400px для точного сканирования. Большие значения могут пропускать контакты.
               </p>
            </div>
          </div>
        </div>

        {/* Code Output Column */}
        <div className="relative flex flex-col h-full">
          <div className="absolute top-2 right-2 z-10">
            <button 
              onClick={handleCopy}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all shadow-lg transform active:scale-95 ${copied ? 'bg-whatsapp-500 text-white' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'}`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Скопировано' : 'Копировать код'}
            </button>
          </div>
          <pre className="w-full flex-grow min-h-[400px] bg-slate-950 p-4 pt-10 rounded-lg overflow-auto text-xs font-mono text-green-400 border border-slate-800 custom-scrollbar shadow-inner">
            <code>{generatedCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ScriptGenerator;