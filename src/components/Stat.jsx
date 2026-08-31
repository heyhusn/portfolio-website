import { forwardRef } from "react";
import { useCounter } from "../motion/hooks.js";

/**
 * Counting statistic. Supports decimals — the static build was integers only,
 * and a CGPA of 3.94 rounds to 4 without this.
 */
const Stat = forwardRef(function Stat(
  { value, label, suffix = "", decimals = 0, className, ...rest },
  outerRef
) {
  const [ref, text] = useCounter(value, { suffix, decimals });

  return (
    <div className={className ?? "stat"} ref={outerRef} {...rest}>
      <div className="stat__num" ref={ref}>
        {text}
      </div>
      <div className="stat__label">{label}</div>
    </div>
  );
});

export default Stat;
