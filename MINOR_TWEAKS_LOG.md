# Minor Tweaks Phase Log

This file tracks all modifications made during the minor tweaks phase, including the exact change made and the reason behind it.

## Changes Log

*No changes made yet.*

- **Added "Keep me logged in" checkbox to Login Form (`frontend/src/features/auth/ui/AuthForm.tsx` & `backend/accounts/views.py`)**
  - **Change:** Added a checkbox to the UI during login, modified `LoginPayload` in `types.ts` to accept `remember_me`, and updated the Django `login_view` to set `request.session.set_expiry(0)` if the user leaves the box unchecked.
  - **Reason:** Users were defaulting to a persistent login session. The default behavior is now to log the user out when the browser closes unless they explicitly opt into a persistent session.


- **Integrated Aceternity UI Macbook Scroll & Text Hover Effect into Login/Signup (`frontend/src/shared/ui/macbook-scroll.tsx` & `frontend/src/shared/ui/text-hover-effect.tsx` & `LoginPage.tsx` & `SignupPage.tsx`)**
  - **Change:** Installed dependencies (`motion`, `clsx`, `tailwind-merge`, `@tabler/icons-react`), added two new UI components, modified them to accept `children` instead of an image `src`, and wrapped the `AuthForm` in them on the login and signup pages. Added a 'Scroll down to proceed' pulse animation.
  - **Reason:** To significantly enhance the visual aesthetic of the login and signup screens with high-quality, interactive framer-motion animations requested by the user.


- **Redesigned AuthForm aesthetic and Macbook integration (`LoginPage.tsx`, `SignupPage.tsx`, `AuthForm.tsx`)**
  - **Change:** Moved the `TextHoverEffect` "LOGIN"/"SIGNUP" text *inside* the Macbook screen so it scales down natively and remains visible when entering credentials. Modified `AuthForm` to accept a `className` override and a `hideHeader` prop, completely stripping out its borders, background, and default header to blend seamlessly into a custom inner screen gradient (`bg-gradient-to-b from-canvas to-[#111114]`).
  - **Reason:** The previous implementation caused the text to scroll out of view and the form had ugly card borders that clashed with the sleek Macbook aesthetic. The new layout feels vastly more premium, spatial, and cohesive with the Macbook's glass screen.

- **Removed Internal Macbook Scrolling (`LoginPage.tsx`, `SignupPage.tsx`, `macbook-scroll.tsx`)**
  - **Change:** Shrunk the `TextHoverEffect` container from `h-32` down to `h-16`, reduced the vertical padding around the `AuthForm`, and hardcoded `overflow-hidden` on the inner `Lid` screen container.
  - **Reason:** The form elements were previously taller than the physical bounds of the Macbook screen (376px), causing an internal scrollbar to appear. By carefully tightening the spatial constraints, the entire form fits perfectly on the screen without needing an extra nested scroll.

- **App-wide Sexy Theme Toggle (`ThemeToggle.tsx`, `ThemeToggle.css`, `index.css`, `tailwind.config.js`)**
  - **Change:** Integrated a gorgeous SVG-based Sun/Moon animated switch at the top-right of the application. Upgraded the entire CSS architecture by converting all hardcoded Tailwind config colors to dynamic CSS variables (`var(--canvas)`, `var(--surface)`). Added semantic `.dark` variants and smooth CSS transitions on `body`.
  - **Reason:** Per the user's request, we needed a pixel-perfect, premium dark/light mode toggle. By mapping Tailwind's color palette to CSS variables, every component (including the Macbook lid gradient and Auth forms) now elegantly fades between light and dark modes instantly without layout thrashing.

- **Native View Transition Ripple Effect (`ThemeToggle.tsx`, `index.css`)**
  - **Change:** Stripped out the basic CSS `body` transition and hooked up the native `document.startViewTransition` API directly into the Sun/Moon toggle. Captured the coordinates of the fixed switch in the corner and injected an animated `clipPath` circle.
  - **Reason:** This takes the toggle to a truly world-class standard. Instead of a simple crossfade, toggling the switch now casts a beautiful radial ripple effect that expands out from the switch itself, sweeping across the viewport to reveal the new theme.

- **Enhanced TextHoverEffect Visibility & Layout (`text-hover-effect.tsx`, `index.css`)**
  - **Change:** Replaced the near-invisible, hardcoded `neutral-200` outlines with responsive, semantic tokens. Initially tried Tailwind opacity modifiers (like `text-primary/5`), but because Tailwind v3 cannot parse hex CSS variables with opacity modifiers, it resulted in a solid black text rendering bug. Extracted the styling into robust inline SVG styles (`fillOpacity: 0.05`). Thickened the hover stroke width from `0.3` to `1.5`. Also shrunk the font size from `text-7xl` to `text-5xl` and widened the SVG `viewBox` from 300 to 400. Replaced the hardcoded vibrant gradient colors with CSS variables (`--hover-1` through `--hover-5`).
  - **Reason:** The previous text outline was completely illegible until hovered, looking like a rendering error. Because "SIGNUP" is longer than "LOGIN", the massive `text-7xl` size was causing it to clip outside the narrow 300px `viewBox`. Shrinking the font and widening the box completely fixes the cutoff. Finally, the bright yellow/cyan hover colors clashed violently with light mode, so I implemented dynamic CSS variables that supply deep, rich, saturated colors for light mode, and bright, glowing neon colors for dark mode. The hex-opacity bug fix ensures the frosted glass effect renders identically on all browsers.

- **Dynamic Screen Scaling & Squeeze (`macbook-scroll.tsx`)**
  - **Change:** Increased the absolute inner screen `Lid` height from `h-96` (24rem) to `h-[28rem]` (448px), while modifying the `Framer Motion` `scaleY` scroll physics to start at `0.48` instead of `0.6` when the laptop is closed.
  - **Reason:** The `SignupPage` has 4 input fields compared to the `LoginPage`'s 3. Because I completely locked out internal scrolling to make it feel like native software, the 4th input was slightly cramped/clipping. By increasing the screen's canvas height, both forms now fit with luxurious breathing room. However, a taller lid would naturally clip right through the keyboard base when folded shut. By adjusting the `scaleY` scroll physics down to `0.48`, the laptop elegantly "squeezes" the taller screen down to fit perfectly on the deck the moment you scroll up and close it.

- **Centered Form Scroll Runway (`LoginPage.tsx`, `SignupPage.tsx`)**
  - **Change:** Removed the `pb-[20vh]` runway padding from the `<main>` wrappers.
  - **Reason:** The extra scroll space caused the bottom edge of the laptop base (which naturally scrolls up) to overlap with the floating laptop lid in a weird way, creating a "black box" visual artifact at the bottom of the screen. I stripped the extra scroll runway to keep the animation perfectly synchronized with the viewport without visual clipping.

- **Restored Elegant Inner Scroll (`macbook-scroll.tsx`)**
  - **Change:** Swapped the inner Macbook screen container from `overflow-hidden` to `overflow-y-auto`, added Webkit scrollbar-hiding CSS (`[&::-webkit-scrollbar]:hidden`), and implemented a `min-h-full flex` wrapper.
  - **Reason:** Per the user's request, scrolling is now completely enabled *inside* the small box. By hiding the ugly native scrollbars, it still feels like a clean native OS window, but on extremely tiny displays where the signup form might still feel cramped, the user can now freely scroll the form up and down inside the Macbook screen without breaking the outer layout! The flex wrapper ensures the top of the form is never clipped when scrolling.

- **Responsive Viewport Centering Physics (`macbook-scroll.tsx`)**
  - **Change:** Stripped out the hardcoded `[0, 1500]` translateY value that Aceternity UI uses for its scroll animations. Rewrote the hook to calculate dynamic physics based on a live `windowHeight` state: `[0, (windowHeight * 1.5) - 656]`. Also updated the `useScroll` offset boundaries from `["start start", "end start"]` to `["start top", "end bottom"]`.
  - **Reason:** The original library hardcoded a `1500px` downward translation which violently pushed the screen off smaller monitors. But fixing the math revealed a second flaw: `["start start", "end start"]` meant the animation only hit 100% when the user scrolled an extra 100vh past the bottom of the container, creating a "disjointed" half-scrolled state. By switching the offsets to track when the container hits the *bottom* of the screen, the laptop opens gracefully and perfectly completes its animation the absolute millisecond you hit the bottom of the page. No extra scrolling required.

- **Fixed TextHoverEffect Gradient Rendering (`text-hover-effect.tsx`)**
  - **Change:** Stripped out `gradientUnits="userSpaceOnUse"`, `cx`, `cy`, and `r` attributes from the hover `<linearGradient>`.
  - **Reason:** The original Aceternity UI component accidentally mixed radial gradient attributes (`cx, cy, r`) into a `<linearGradient>` tag, resulting in invalid SVG syntax. Depending on the browser and the exact aspect ratio of the `viewBox`, this caused the gradient to either completely fail to render or render incorrectly clipped. Cleaning the SVG structure restores the vibrant hover effect perfectly.

- **Removed Broken Macbook Background Gradient (`LoginPage.tsx`, `SignupPage.tsx`)**
  - **Change:** Set `showGradient={false}` on the `<MacbookScroll>` components.
  - **Reason:** The original Aceternity UI component injected an absolute `from-[#272729]` dark grey background gradient to simulate a shadow. Because I upgraded the entire application to a dynamic, semantic Light/Dark mode (`bg-canvas`), this hardcoded grey gradient was violently clashing with our actual background colors, looking like an ugly, broken, grey box overlayed on the page. By disabling it, the Macbook now floats beautifully against our flawless, native background colors.

- **Fixed Inner Macbook Screen Gradient Cutoff (`LoginPage.tsx`, `SignupPage.tsx`)**
  - **Change:** Moved the massive `pb-48` scroll padding out of the `macbook-scroll.tsx` wrapper and directly into the form wrapper, changing it from `h-full` to `min-h-full`.
  - **Reason:** When I added the ability to scroll deep into the small window, the gorgeous `from-canvas to-surface-raised` gradient was hardcoded to `h-full`. This meant the browser only painted the background for the initial visible height of the screen! When the user scrolled down into the padded area, the background simply stopped existing, abruptly cutting off and revealing the flat canvas color behind it. By stretching it with `min-h-full`, the gradient now scales dynamically across the entire scrollable region.
