(function () {
  const STYLE_ID = 'genba-calendar-fixed-layout';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #sc-cal.screen.active {
        display: flex;
        flex-direction: column;
        height: 100dvh;
        min-height: 100dvh;
        overflow: hidden;
        padding-bottom: 0;
        overscroll-behavior: contain;
      }
      #sc-cal .topbar,
      #sc-cal .month-nav {
        position: relative;
        top: auto;
        flex: 0 0 auto;
      }
      #sc-cal .month-nav {
        box-shadow: 0 1px 0 var(--line);
      }
      #sc-cal #cal-grid {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden;
        align-content: stretch;
      }
      #sc-cal .cal-day {
        min-height: 0;
      }
      #sc-cal .task-stack {
        min-height: 0;
      }
      #sc-cal .sum-grid {
        flex: 0 0 auto;
        padding: 8px 10px calc(10px + var(--safe-bot));
        background: rgba(238, 243, 248, .98);
        border-top: 1px solid var(--line);
        box-shadow: 0 -10px 24px rgba(15, 23, 42, .07);
      }
      #sc-cal .sum-card {
        min-height: 58px;
        border-radius: 10px;
        padding: 8px 10px;
      }
      #sc-cal .sl {
        font-size: 11px;
        line-height: 1.2;
      }
      #sc-cal .sv {
        font-size: 19px;
        line-height: 1.1;
        margin-top: 3px;
      }
      #sc-cal .fab {
        bottom: calc(126px + var(--safe-bot));
      }
      @media (max-width: 480px) {
        #sc-cal .topbar {
          padding-bottom: 8px;
        }
        #sc-cal .month-nav {
          padding: 8px 14px;
        }
        #sc-cal .month-nav button {
          height: 36px;
        }
        #sc-cal .month-label {
          font-size: 24px;
        }
        #sc-cal .cal-grid {
          padding-bottom: 4px;
        }
        #sc-cal .cal-dow {
          min-height: 24px;
          height: 24px;
          font-size: 13px;
        }
        #sc-cal .cal-day {
          padding: 2px 3px 3px;
        }
        #sc-cal .dn {
          height: 19px;
          font-size: 15px;
        }
        #sc-cal .cal-day.today .dn {
          width: 23px;
          height: 23px;
        }
        #sc-cal .cal-task {
          min-height: 15px;
          font-size: 10.5px;
          padding: 2px 3px;
        }
        #sc-cal .sum-grid {
          gap: 6px;
          padding: 7px 9px calc(9px + var(--safe-bot));
        }
        #sc-cal .sum-card {
          min-height: 52px;
          padding: 7px 9px;
        }
        #sc-cal .sl {
          font-size: 10px;
        }
        #sc-cal .sv {
          font-size: 17px;
        }
        #sc-cal .fab {
          width: 54px;
          height: 54px;
          bottom: calc(116px + var(--safe-bot));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function preventCalendarSwipe(event) {
    const calendar = document.getElementById('sc-cal');
    if (!calendar?.classList.contains('active')) return;
    if (event.target.closest('.modal-bg.open, .day-modal-bg.open')) return;
    event.preventDefault();
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyle();
    document.addEventListener('touchmove', preventCalendarSwipe, { passive: false });
  });
})();
