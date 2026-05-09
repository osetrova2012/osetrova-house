import './NormsModal.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function NormsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="norms-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Нормы ИЖС"
      onMouseDown={(e) => {
        // закрыть по клику на затемнение
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      tabIndex={-1}
    >
      <div className="norms-card">
        <div className="norms-head">
          <div className="norms-title">Нормы ИЖС для симулятора планирования участка</div>
          <button className="norms-close" type="button" aria-label="Закрыть" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="norms-body">
          <section className="norms-section">
            <h3>Земельный участок (ИЖС)</h3>
            <div className="norms-table">
              <div className="row head">
                <div>Параметр</div><div>Норма</div><div>Пояснение</div>
              </div>
              <div className="row">
                <div>Минимальная площадь участка</div><div>600 м² (6 соток)</div><div>Типовой минимум для ИЖС</div>
              </div>
              <div className="row">
                <div>Максимальная площадь участка</div><div>до 2500 м² (25 соток)</div><div>Часто применяется, зависит от ПЗЗ</div>
              </div>
              <div className="row">
                <div>Минимальная ширина участка</div><div>≈ 10 м</div><div>Рекомендуемая для размещения дома</div>
              </div>
              <div className="row">
                <div>Застройка участка</div><div>не более 40%</div><div>Дом + постройки</div>
              </div>
            </div>
          </section>

          <section className="norms-section">
            <h3>Расположение дома относительно границ</h3>
            <div className="norms-table">
              <div className="row head">
                <div>От чего измеряется</div><div>Минимальное расстояние</div><div>Основание</div>
              </div>
              <div className="row">
                <div>До границы соседнего участка (забора)</div><div>3 м</div><div>СП 53.13330</div>
              </div>
              <div className="row">
                <div>До красной линии улицы</div><div>5 м</div><div>СП 42.13330</div>
              </div>
              <div className="row">
                <div>До красной линии проезда</div><div>3 м</div><div>СП 42.13330</div>
              </div>
            </div>
          </section>

          <section className="norms-section">
            <h3>Хозяйственные постройки (ИЖС)</h3>
            <div className="norms-table">
              <div className="row head">
                <div>Объект</div><div>Минимальное расстояние</div><div>Комментарий</div>
              </div>
              <div className="row">
                <div>Хозпостройки (сарай, теплица) → забор</div><div>1 м</div><div>Допустимо</div>
              </div>
              <div className="row">
                <div>Баня / сауна → дом</div><div>8 м</div><div>Санитарная норма</div>
              </div>
              <div className="row">
                <div>Гараж → забор</div><div>1 м</div><div>Разрешено</div>
              </div>
              <div className="row">
                <div>Постройки с животными (будка) → забор</div><div>4 м</div><div>Повышенные требования</div>
              </div>
            </div>
          </section>

          <section className="norms-section">
            <h3>Насаждения (озеленение)</h3>
            <div className="norms-table">
              <div className="row head">
                <div>Объект</div><div>До границы участка</div><div>До жилого дома</div>
              </div>
              <div className="row">
                <div>Высокие деревья</div><div>4 м</div><div>5 м</div>
              </div>
              <div className="row">
                <div>Среднерослые деревья</div><div>2 м</div><div>5 м</div>
              </div>
              <div className="row">
                <div>Кустарники</div><div>1 м</div><div>1,5 м</div>
              </div>
            </div>
          </section>

          <section className="norms-section">
            <h3>Ориентация дома по солнцу</h3>
            <ul className="norms-list">
              <li><b>Юг:</b> гостиные, детские, общие комнаты (максимум света).</li>
              <li><b>Восток:</b> спальни, кухни (для раннего пробуждения).</li>
              <li><b>Запад:</b> гостиные для вечернего времяпрепровождения, кабинеты (требует защиты от солнца).</li>
              <li><b>Север:</b> нежилые и технические помещения.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
