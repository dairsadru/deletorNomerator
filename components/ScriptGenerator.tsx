
import React, { useState, useEffect } from 'react';
import { ScriptConfig } from '../types';
import { Copy, Check, Terminal, Users, Eye, MessageCircle } from 'lucide-react';

const ScriptGenerator: React.FC = () => {
  const [config, setConfig] = useState<ScriptConfig>({
    mode: 'viewers', // 'viewers', 'contacts', or 'chats'
    scrollStep: 300,
    scrollDelay: 2000, // Increased delay slightly for stability
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
    const isChatsMode = config.mode === 'chats';
    
    let targetName = 'Все Контакты';
    if (isViewersMode) targetName = 'Зрители Статуса';
    if (isChatsMode) targetName = 'Активные Чаты';
    
    // --- ЛОГИКА ПОИСКА КОНТЕЙНЕРА ---
    let strategyLogic = '';
    
    if (isViewersMode) {
      strategyLogic = `
        // РЕЖИМ: ЗРИТЕЛИ
        const root = document.querySelector('div[role="dialog"]') || document.querySelector('span[data-icon="x-viewer"]')?.closest('div[role="dialog"]');
        if (!root) throw new Error('Окно списка зрителей не найдено! Откройте список глазком.');
        scrollContainer = findScrollable(root);
      `;
    } else if (isChatsMode) {
      strategyLogic = `
        // РЕЖИМ: АКТИВНЫЕ ЧАТЫ
        // Панель слева #pane-side
        scrollContainer = document.getElementById('pane-side');
        if (!scrollContainer) scrollContainer = document.querySelector('div[aria-label="Chat list"]');
        
        // Fallback: ищем самый большой скролл в левой части экрана
        if (!scrollContainer) {
             const allDivs = Array.from(document.querySelectorAll('div'));
             // Фильтруем те, что слева и высокие
             const leftPanelCandidates = allDivs.filter(d => {
                 const r = d.getBoundingClientRect();
                 return r.left < 100 && r.width > 200 && r.width < 600 && r.height > 400;
             });
             // Ищем среди них скроллящийся
             for (let d of leftPanelCandidates) {
                 if (findScrollable(d)) {
                     scrollContainer = d;
                     break;
                 }
             }
        }
        if (!scrollContainer) throw new Error('Не найдена панель чатов (слева).');
      `;
    } else {
      strategyLogic = `
        // РЕЖИМ: ВСЕ КОНТАКТЫ (НОВЫЙ ЧАТ)
        // 1. Ищем по заголовку "Новый чат" или кнопке "Назад"
        const backBtn = document.querySelector('span[data-icon="back"]');
        const newChatHeader = document.evaluate("//*[text()='Новый чат' or text()='New chat']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        
        let drawer = null;
        if (newChatHeader) drawer = newChatHeader.closest('header')?.nextElementSibling || newChatHeader.closest('div[style*="height: 100%"]');
        if (!drawer && backBtn) drawer = backBtn.closest('header')?.nextElementSibling;

        if (drawer) {
            scrollContainer = findScrollable(drawer);
        }

        // 2. Если не нашли, ищем по "Новая группа" (всегда первая в списке контактов)
        if (!scrollContainer) {
             const newGroupItem = document.evaluate("//*[text()='Новая группа' or text()='New group']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
             if (newGroupItem) {
                 // Поднимаемся вверх пока не найдем скролл
                 let p = newGroupItem.parentElement;
                 while(p && p !== document.body && !scrollContainer) {
                     if (findScrollable(p) === p) scrollContainer = p;
                     p = p.parentElement;
                 }
             }
        }

        if (!scrollContainer) throw new Error('Не найдена панель "Новый чат". Откройте её заново.');
      `;
    }

    const code = `
(async () => {
  console.clear();
  console.log('%c 🚀 StatusLens: Запуск (${targetName})... ', 'background: #22c55e; color: #fff; padding: 4px; font-weight: bold;');
  
  // --- ХЕЛПЕРЫ ---
  function findScrollable(el) {
      if (!el) return null;
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const isScrollable = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');
      const hasHeight = el.scrollHeight > el.clientHeight;
      return (isScrollable && hasHeight) ? el : null;
  }

  function isLikelyContactName(text) {
      if (!text) return false;
      const t = text.trim();
      if (t.length < 2) return false;
      if (t.length > 40) return false; // Слишком длинное скорее всего сообщение
      
      // Исключаем время
      if (/^\\d{1,2}:\\d{2}\\s*(am|pm)?$/i.test(t)) return false;
      if (/^\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}$/.test(t)) return false;
      if (/^(вчера|сегодня|yesterday|today)$/i.test(t)) return false;
      
      // Исключаем системные
      const blocklist = ['новый чат', 'new chat', 'новая группа', 'new group', 'новое сообщество', 'new community', 'поиск', 'search', 'контакты в whatsapp', 'contacts on whatsapp', 'вы', 'you', 'печатает...', 'typing...', 'в сети', 'online', 'был(а)', 'last seen'];
      if (blocklist.some(b => t.toLowerCase().includes(b))) return false;
      
      return true;
  }

  try {
    let scrollContainer = null;
    
    ${strategyLogic}
    
    console.log('%c ✅ Контейнер найден:', 'color: #22c55e', scrollContainer);

    const CONFIG = {
      scrollStep: ${config.scrollStep},
      delayMs: ${config.scrollDelay},
      maxStableTries: 8,
    };

    let namesSet = new Set();
    let stableCount = 0;
    
    // Сброс
    scrollContainer.scrollTop = 0;
    await new Promise(r => setTimeout(r, 1000));

    while (stableCount < CONFIG.maxStableTries) {
      let foundOnStep = 0;
      
      // --- СТРАТЕГИЯ 1: АВАТАРКИ (Самая надежная) ---
      // Ищем все картинки внутри скролла. У аватарок в alt обычно имя.
      const images = Array.from(scrollContainer.querySelectorAll('img[src*="whatsapp"]')); 
      // Иногда src не содержит whatsapp, берем просто img с валидным alt
      const potentialAvatars = scrollContainer.querySelectorAll('img');
      
      for (let img of potentialAvatars) {
          const alt = img.getAttribute('alt');
          // Фильтруем дефолтные alt
          if (alt && !alt.includes('default') && !alt.includes('Profile') && isLikelyContactName(alt)) {
              if (!namesSet.has(alt)) {
                  namesSet.add(alt);
                  foundOnStep++;
              }
          }
      }

      // --- СТРАТЕГИЯ 2: SPAN[TITLE] ---
      const titleSpans = scrollContainer.querySelectorAll('span[title]');
      for (let span of titleSpans) {
          const title = span.getAttribute('title');
          if (isLikelyContactName(title)) {
              if (!namesSet.has(title)) {
                  namesSet.add(title);
                  foundOnStep++;
              }
          }
      }

      // --- СТРАТЕГИЯ 3: ТЕКСТ (DIR="AUTO") ---
      // Если предыдущие стратегии дали мало результатов, пробуем "пылесос"
      if (foundOnStep < 5) {
          const textSpans = scrollContainer.querySelectorAll('span[dir="auto"]');
          for (let span of textSpans) {
              // Хак: Имена обычно имеют специфический шрифт или цвет. 
              // Но для надежности берем текст и жестко фильтруем.
              const text = span.innerText;
              
              // Доп фильтр для чатов: игнорируем текст сообщения (обычно он серый, имя черное/белое)
              const color = window.getComputedStyle(span).color;
              // Это сложно детектить универсально, поэтому полагаемся на isLikelyContactName
              
              if (isLikelyContactName(text)) {
                  // Еще одна проверка: в списке чатов имя обычно наверху блока
                  if (!namesSet.has(text)) {
                      namesSet.add(text);
                      foundOnStep++;
                  }
              }
          }
      }

      console.log(\`🔍 Шаг сканирования: нашел +\${foundOnStep} (Всего: \${namesSet.size})\`);

      // --- ПРОКРУТКА ---
      const prevScroll = scrollContainer.scrollTop;
      scrollContainer.scrollBy(0, CONFIG.scrollStep);
      await new Promise(r => setTimeout(r, CONFIG.delayMs));

      if (Math.abs(scrollContainer.scrollTop - prevScroll) < 2) {
         stableCount++; // Уперлись
      } else {
         if (foundOnStep === 0) stableCount++;
         else stableCount = 0; // Сбрасываем счетчик если нашли новые
      }
    }

    // --- ФИНАЛ ---
    const resultList = Array.from(namesSet).sort();
    
    console.log(\`%c 🎉 ГОТОВО: Найдено \${resultList.length} уникальных контактов \`, 'background: #22c55e; color: white; font-size: 14px; padding: 5px;');
    
    if (resultList.length === 0) {
        alert('Контакты не найдены. Попробуйте еще раз или прокрутите список вручную.');
    } else {
        // Создаем кнопку
        const btnId = 'sl-result-btn';
        document.getElementById(btnId)?.remove();
        
        const btn = document.createElement('button');
        btn.id = btnId;
        btn.innerText = \`📋 Скопировать \${resultList.length} контактов\`;
        Object.assign(btn.style, {
            position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 10000, padding: '15px 30px', fontSize: '18px', fontWeight: 'bold',
            backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '50px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)', cursor: 'pointer'
        });
        
        btn.onclick = () => {
            navigator.clipboard.writeText(resultList.join('\\n'));
            btn.innerText = '✅ Скопировано!';
            btn.style.backgroundColor = '#128C7E';
            setTimeout(() => btn.remove(), 3000);
        };
        
        document.body.appendChild(btn);
    }

  } catch (e) {
    console.error(e);
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
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center gap-1 ${config.mode === 'viewers' ? 'bg-whatsapp-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                <Eye className="w-4 h-4" />
                Зрители
              </button>
              <button 
                onClick={() => setConfig({...config, mode: 'contacts'})}
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center gap-1 ${config.mode === 'contacts' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                <Users className="w-4 h-4" />
                Все Контакты
              </button>
              <button 
                onClick={() => setConfig({...config, mode: 'chats'})}
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition flex flex-col items-center justify-center gap-1 ${config.mode === 'chats' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                <MessageCircle className="w-4 h-4" />
                Активные Чаты
              </button>
            </div>
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/20 rounded text-xs text-blue-200">
               <strong>Инструкция:</strong>
               {config.mode === 'viewers' && (
                 <ol className="list-decimal ml-4 mt-1 space-y-1 text-slate-400">
                   <li>Откройте статус в WhatsApp Web.</li>
                   <li>Нажмите список зрителей (иконка глаза).</li>
                   <li>Вставьте код.</li>
                 </ol>
               )}
               {config.mode === 'contacts' && (
                 <ol className="list-decimal ml-4 mt-1 space-y-1 text-slate-400">
                   <li>Нажмите "Новый чат" (иконка 💬 сверху).</li>
                   <li>Убедитесь, что список контактов открылся слева.</li>
                   <li>Вставьте код.</li>
                 </ol>
               )}
               {config.mode === 'chats' && (
                 <ol className="list-decimal ml-4 mt-1 space-y-1 text-slate-400">
                   <li>Просто откройте WhatsApp Web.</li>
                   <li>Убедитесь, что список чатов виден слева.</li>
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
                 Рекомендуется 300px. Если пропускает - уменьшите.
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
