# Media Hook Matrix

This matrix maps the supplied Steve Madden GIF references to the local Hook Atlas seed hooks. Each asset can be reused across more than one hook, but the primary hooks are the strongest creative fit.

| Media asset | Confidence | Visible pattern | Primary hook matches | Gap category candidates | Why it fits |
| --- | --- | --- | --- | --- | --- |
| `sm-bitmoji-twinning.gif` | Strong | Creator outfit beside matching Bitmoji/avatar, red boots, playful social overlay | `split-screen-compare`, `visual-pattern-interrupt`, `this-or-that` | `digital-double`, `persona-match` | The side-by-side avatar/product match is an instant comparison and visual break. It works best when the hook is about similarity, contrast, or a playful feed interrupt. |
| `sm-date-night.gif` | Medium | Editorial "Date Night" text overlay, outfit reveal, soft glam styling | `text-first`, `face-close-up`, `self-identification` | `occasion-fit`, `style-context` | The current hooks work, but the real native category is occasion styling: the event is the hook, not just the text. |
| `sm-summer-festival-shoes.gif` | Strong | Creator holds two shoes, headline promises "The 2 Shoes", seasonal shopping context | `countdown-tease`, `this-or-that`, `instant-value` | `two-pick-edit`, `seasonal-buying-guide` | The numbered product promise is already a hook. It naturally supports list, comparison, and practical recommendation structures. |
| `sm-boots-forecast-pov.gif` | Medium | Shoe box close-up, "POV: Boots Forecast" overlay, unboxing/forecast framing | `pov-shot`, `mystery-object`, `before-you-scroll` | `trend-forecast`, `box-reveal` | The box creates a reveal loop and the POV label gives the viewer an immediate role inside the scene, but "forecast" deserves its own trend category. |
| `sm-closet-update.gif` | Medium | Wide creator movement, "Time to update your closet", energetic outfit reveal | `before-you-scroll`, `stop-doing-this`, `zoom-in-hook` | `closet-reset`, `seasonal-refresh` | The line is a direct behavior prompt, but the commerce-native category is wardrobe refresh or closet reset. |

## Scoring Logic

| Score signal | What to look for | Strong hook families |
| --- | --- | --- |
| Text overlay leads the frame | The on-screen words carry the first beat | `text-first`, `kinetic-typography`, `before-you-scroll` |
| Product count or list | A visible number, "2 shoes", "3 ways", ranked picks | `countdown-tease`, `step-by-step`, `save-this` |
| Side-by-side contrast | Two products, two looks, avatar vs creator, before vs after | `split-screen-compare`, `this-or-that`, `transformation-before-after` |
| Box/reveal object | A concealed item, package, close-up texture, partial reveal | `mystery-object`, `curiosity-gap`, `cliffhanger-cut` |
| Creator motion/energy | Walk-in, jump, dance, fast entrance, camera punch | `zoom-in-hook`, `bass-drop`, `visual-pattern-interrupt` |
| Occasion/persona targeting | Date night, festival, closet refresh, POV role | `self-identification`, `pov-shot`, `instant-value` |

The app now uses these five GIFs as promoted inspiration records and as card media for their strongest matching hooks.

## Expanded Intake Batch

These newer references use the stricter rule: source clips do not replace Atlas hook-card media by default. They stay in Inspiration with first-3-second analysis. Only after the first frame, first text/audio, and opening mechanic are reviewed should a source be promoted into an Atlas hook example.

| Media asset | Confidence | Current hook matches | Gap category candidates | Notes |
| --- | --- | --- | --- | --- |
| `ramadan-health-advice.mp4` | Medium | `instant-value`, `save-this`, `step-by-step` | `cultural-moment-advice`, `wellness-ritual` | Useful education, but the native hook is seasonal/cultural advice. |
| `ramadan-beauty-makeup.mp4` | Medium | `step-by-step`, `tool-demo`, `save-this` | `cultural-moment-advice`, `occasion-routine` | Better as a Ramadan routine/occasion format than a generic tutorial. |
| `ramadan-salad-iftar-suhoor.mp4` | Strong | `step-by-step`, `instant-value`, `save-this` | `meal-timing-split`, `cultural-moment-advice` | Strong fit because the meal timing creates clear utility. |
| `snack-product-hold-excited.gif` | Medium | `face-close-up`, `proof-first`, `testimonial-flash` | `taste-test-setup`, `product-haul-intro` | Good creator reaction, but not specific enough to own a hook card. |
| `snack-which-one-plate.gif` | Strong | `this-or-that`, `self-identification`, `mystery-object` | `choice-game`, `interactive-identity` | Strong identity/choice hook. |
| `snack-silent-review.gif` | Gap | none primary | `silent-review`, `reaction-review` | This should become a new hook instead of being forced into `silence-break`. |
| `snack-product-face-animate.gif` | Strong | `visual-pattern-interrupt`, `mystery-object`, `glitch-effect` | `product-persona`, `animated-pack` | Strong visual interrupt because the pack becomes a character. |
| `mom-baby-unboxing.gif` | Medium | `behind-the-scenes`, `b-roll-cut-away`, `story-open` | `use-case-unboxing`, `room-reset` | Best treated as lifestyle/use-case unboxing. |
| `food-market-perspective.gif` | Strong | `visual-pattern-interrupt`, `pov-shot`, `mystery-object` | `forced-perspective`, `location-reveal` | Strong visual trick and location reveal. |
| `loewe-on-collab-throw.gif` | Medium | `text-first`, `b-roll-cut-away`, `proof-first` | `collab-reveal`, `drop-signal` | The collab itself is the hook. |
| `sneaker-product-detail.gif` | Strong | `b-roll-cut-away`, `proof-first`, `mystery-object` | `macro-product-proof`, `detail-first` | Strong detail/proof footage. |
| `adidas-ar-box-reveal.gif` | Strong | `mystery-object`, `visual-pattern-interrupt`, `glitch-effect` | `ar-overlay-reveal`, `box-reveal` | Strong reveal, but future taxonomy should separate AR overlays. |
| `giant-box-surreal-ooh.gif` | Strong | `visual-pattern-interrupt`, `shock-value`, `mystery-object` | `surreal-scale`, `cgi-ooh` | Strong CGI/scale interrupt. |
| `bolt.mp4` | Gap | none primary | `unreviewed-reference`, `app-service-proof` | Filename alone is not enough for an honest match. |
| `ugc-ref-a795.mp4` | Gap | none primary | `unreviewed-reference` | Needs visual/script review. |
| `ugc-ref-3fd78.mp4` | Gap | none primary | `unreviewed-reference` | Needs visual/script review. |
| `ugc-ref-ac055.mp4` | Gap | none primary | `unreviewed-reference` | Needs visual/script review. |
| `ugc-ref-e8dfa.mp4` | Gap | none primary | `unreviewed-reference` | Needs visual/script review. |

## Additional GIF Source Batch

| Media asset | Confidence | Current hook matches | Gap category candidates | Notes |
| --- | --- | --- | --- | --- |
| `ursa-major-minimal-product.gif` | Medium | `b-roll-cut-away`, `mystery-object` | `minimal-pack-shot`, `negative-space-product` | Clean pack motion, but more of a product loop than a full hook. |
| `filling-pieces-48h-sale.gif` | Strong | `fear-of-missing-out`, `text-first`, `kinetic-typography` | `timed-sale`, `kinetic-offer` | Strong offer urgency with kinetic sale text. |
| `red-bottle-silhouette.gif` | Strong | `mystery-object`, `curiosity-gap`, `cliffhanger-cut` | `silhouette-reveal` | Shape-first product reveal. |
| `kenco-ingredient-layout.gif` | Strong | `proof-first`, `b-roll-cut-away`, `instant-value` | `ingredient-proof`, `overhead-layout` | Ingredients create immediate proof. |
| `sneaker-sky-product-grid.gif` | Strong | `split-screen-compare`, `this-or-that`, `b-roll-cut-away` | `range-grid`, `product-menu` | Collection/range showcase. |
| `jordan-box-tilt.gif` | Strong | `mystery-object`, `proof-first`, `b-roll-cut-away` | `box-reveal`, `premium-packaging` | Premium packaging reveal. |
| `heinz-organic-product.gif` | Medium | `proof-first`, `text-first` | `certification-proof`, `pack-claim` | Product claim is clear, but not a distinct first-second hook by itself. |
| `turning-red-streaming-title.gif` | Medium | `text-first`, `bold-claim` | `streaming-title-card`, `availability-drop` | Useful release card; streaming/title availability needs its own lane. |
| `probears-pdp-match.gif` | Strong | `proof-first`, `tool-demo`, `split-screen-compare` | `pdp-match`, `ecommerce-proof` | Physical product and PDP match create trust. |
| `arabic-bonita-offer-proof.gif` | Medium | `proof-first`, `bold-claim`, `instant-value` | `offer-proof-stack`, `localized-commerce` | Offer/proof stack, but more performance-commerce than generic hook. |
| `creator-yellow-caption-block.gif` | Gap | none primary | `caption-template`, `blank-hook-card` | Blank caption area means we need the actual text before mapping. |
| `weekday-loading-retail.gif` | Strong | `countdown-tease`, `text-first`, `curiosity-gap` | `loading-tease`, `anticipation-card` | Loading bar is a clean suspense/countdown device. |
| `hajj-public-service-crowd.gif` | Medium | `proof-first`, `text-first`, `save-this` | `public-service-announcement`, `crowd-guidance` | Official/logistics content should not be treated like a product ad. |
| `arabic-comment-reply-makeup.gif` | Strong | `testimonial-flash`, `tool-demo`, `self-identification` | `comment-reply`, `audience-challenge` | Reply-to-comment is the hook mechanic. |
| `gaming-sneaker-controller.gif` | Strong | `pov-shot`, `visual-pattern-interrupt`, `mystery-object` | `game-controller-demo`, `playable-product` | Gaming POV turns the shoe into an interactable object. |
| `bepanthen-creator-overlay.gif` | Medium | `face-close-up`, `testimonial-flash`, `proof-first` | `floating-product-overlay`, `creator-recommendation` | Creator trust plus product overlay. |
| `bonita-snap-offer.gif` | Medium | `proof-first`, `instant-value`, `bold-claim` | `snap-offer-stack`, `localized-commerce` | Snapchat-style performance offer. |
| `bitpanda-card-proof.gif` | Strong | `proof-first`, `tool-demo`, `testimonial-flash` | `physical-proof`, `finance-card-proof` | Physical card proves the service. |
| `freedom-card-testimonial.gif` | Strong | `testimonial-flash`, `proof-first`, `face-close-up` | `card-testimonial`, `financial-social-proof` | Human trust plus card proof. |
| `airbnb-brand-card.gif` | Gap | none primary | `brand-icon-loop`, `minimal-logo-motion` | Needs the claim or campaign context before assignment. |
| `roseskin-definition-card.gif` | Strong | `text-first`, `tool-demo`, `self-identification` | `definition-hook`, `product-verb` | Definition card makes the product behavior clear. |
| `roxa-personality-transformation.gif` | Strong | `transformation-before-after`, `plot-twist`, `self-identification` | `persona-after-effect`, `beauty-service-shift` | Transformation is framed as a personality shift. |
| `hijab-creator-talk.gif` | Gap | none primary | `creator-talk-intake`, `unreviewed-reference` | Needs transcript or first-line text to classify honestly. |
| `transit-90m-bold-claim.gif` | Strong | `bold-claim`, `proof-first`, `behind-the-scenes` | `scale-statistic`, `public-logistics-proof` | Big-number authority hook. |
| `flight-booking-tips.gif` | Strong | `instant-value`, `step-by-step`, `save-this` | `travel-tips`, `booking-advice` | Practical travel education. |
| `coffee-pour-sensory.gif` | Medium | `b-roll-cut-away`, `mystery-object`, `proof-first` | `sensory-proof`, `ritual-moment` | Sensory B-roll is useful, but not always a hook alone. |
| `delivery-box-reaction.gif` | Medium | `story-open`, `mystery-object`, `testimonial-flash` | `delivery-reaction`, `arrival-moment` | Reaction and arrival context are the real mechanics. |

## Gap Rule

Do not force a media asset into a weak hook just to keep the matrix full. If an asset has good creative DNA but only a loose fit with the current 44 hooks, classify it as `gap` or `medium`, then propose a new category.

| Proposed category | Proposed hook | Use when | Example opener |
| --- | --- | --- | --- |
| Persona & Identity | The Digital Twin | A creator, avatar, AI clone, Bitmoji, or character version of the buyer is the main visual idea. | "I accidentally dressed exactly like my avatar." |
| Occasion Styling | The Occasion Fit | The strongest reason to watch is an event, vibe, or social situation rather than a product claim. | "The shoes I would wear for date night, brunch, and the after-party." |
| Commerce Picks | The Two-Pick Edit | A product video is primarily a curated edit, shortlist, or shopping recommendation. | "The only two boots I would pack for a weekend trip." |
| Trend Forecast | The Forecast Call | The creator frames the product as a trend prediction or next-season signal. | "POV: these are the boots everyone asks about next month." |
| Wardrobe Refresh | The Closet Reset | The media pushes a refresh, swap, cleanout, capsule, or seasonal update action. | "It is time to retire the old pair and update your closet." |
| Product Reveal | The Box Reveal | The product is hidden inside packaging and the suspense comes from opening or previewing it. | "I already know what is inside this box, and it is about to sell out." |

## Fit Labels

| Label | Meaning | Action |
| --- | --- | --- |
| Strong | The first three seconds naturally express at least one existing hook. | Show as promoted Inspiration and allow opening matching hooks. |
| Medium | The first three seconds are useful, but the native pattern is more specific than the atlas. | Keep in Inspiration and add category candidates. |
| Gap | The asset is useful, but current hooks would mislabel it. | Do not assign a hook as primary; propose a new hook/category first. |
