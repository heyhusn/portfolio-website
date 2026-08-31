import { cloneElement, isValidElement } from "react";
import { useReveal } from "../motion/hooks.js";

/**
 * The `[data-reveal]` fade-and-rise from the static build, as a component.
 *
 * Renders no wrapper of its own when given a single element child — it clones
 * the child and attaches the ref, so the grid and flex layouts in style.css
 * keep their exact parent/child relationships. That matters: wrapping a
 * `.stat` in a div would break `.stats`' three-column grid.
 */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  ...rest
}) {
  const { ref, props } = useReveal(delay);

  if (isValidElement(children) && !rest.forceWrapper) {
    return cloneElement(children, {
      ref,
      ...props,
      className: [children.props.className, props.className, className]
        .filter(Boolean)
        .join(" ") || undefined,
    });
  }

  const { forceWrapper, ...tagProps } = rest;
  return (
    <Tag
      ref={ref}
      {...tagProps}
      {...props}
      className={[className, props.className].filter(Boolean).join(" ") || undefined}
    >
      {children}
    </Tag>
  );
}
