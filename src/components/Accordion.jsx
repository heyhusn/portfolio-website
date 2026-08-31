import { useState, useId, forwardRef } from "react";
import { Plus, Check } from "./Icons.jsx";

/**
 * Single-open accordion, used for both "How I Can Help" and the FAQ.
 *
 * The panel animates with `grid-template-rows: 0fr → 1fr`, exactly as the
 * stylesheet already defines, so the height transition works without measuring
 * anything in JavaScript. Keyboard and screen-reader wiring is real:
 * aria-expanded on the trigger, aria-controls to the panel, and the panel
 * hidden from the accessibility tree while closed.
 */
const Accordion = forwardRef(function Accordion(
  { items, className = "", numbered = true, ...rest },
  ref
) {
  const [openIndex, setOpenIndex] = useState(0);
  const uid = useId();

  return (
    <div className={`acc ${className}`.trim()} data-acc ref={ref} {...rest}>
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${uid}-panel-${i}`;
        const btnId = `${uid}-btn-${i}`;
        return (
          <div className={`acc__item${open ? " is-open" : ""}`} key={item.title ?? item.q}>
            <button
              className="acc__btn"
              type="button"
              id={btnId}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? -1 : i)}
            >
              {numbered ? <span className="acc__num">{i + 1}.</span> : null}
              {item.title ?? item.q}
              <span className="acc__ico" aria-hidden="true">
                <Plus />
              </span>
            </button>

            <div className="acc__panel" id={panelId} role="region" aria-labelledby={btnId}>
              <div>
                {item.items ? (
                  <ul className="acc__list" {...(open ? null : { inert: "" })}>
                    {item.items.map((line) => (
                      <li key={line}>
                        <span className="acc__check" aria-hidden="true">
                          <Check />
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="acc__list" {...(open ? null : { inert: "" })}>
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default Accordion;
