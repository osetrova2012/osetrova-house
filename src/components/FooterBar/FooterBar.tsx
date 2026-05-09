import './FooterBar.css';

interface FooterBarProps {
  leftLabel: string;
  leftIcon?: string;
  onLeft: () => void;

  centerLabel: string;
  centerIcon?: string;
  onCenter: () => void;

  rightLabel: string;
  rightIcon?: string;
  onRight: () => void;

  leftDisabled?: boolean;
  centerDisabled?: boolean;
  rightDisabled?: boolean;
}

export default function FooterBar({
  leftLabel,
  leftIcon,
  onLeft,
  leftDisabled,

  centerLabel,
  centerIcon,
  onCenter,
  centerDisabled,

  rightLabel,
  rightIcon,
  onRight,
  rightDisabled,
}: FooterBarProps) {
  return (
    <div className="footerbar">
      <div className="footerbar-inner">
        <button
          type="button"
          className="fb-btn fb-btn-secondary"
          onClick={onLeft}
          disabled={!!leftDisabled}
        >
          {leftIcon ? <span className="fb-icon" aria-hidden="true"><img src={leftIcon} className="f-icon"/></span> : null}
          <span className="fb-text">{leftLabel}</span>
        </button>

        <button
          type="button"
          className="fb-btn fb-btn-center"
          onClick={onCenter}
          disabled={!!centerDisabled}
          title={centerLabel}
        >
          {centerIcon ? <span className="fb-icon" aria-hidden="true"><img src={centerIcon} className="f-icon"/></span> : null}
          <span className="fb-text">{centerLabel}</span>
        </button>

        <button
  type="button"
  className="fb-btn fb-btn-primary"
  onClick={onRight}
  disabled={!!rightDisabled}
>
  <span className="fb-text">{rightLabel}</span>
  {rightIcon ? (
    <span className="fb-icon" aria-hidden="true">
      {rightIcon}
    </span>
  ) : null}
</button>
      </div>
    </div>
  );
}
