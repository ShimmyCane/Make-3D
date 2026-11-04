# Make 3D — Convo v0.3

**Project:** Make 3D
**Round:** 3. Short follow-up on answers in `convo v0.2.md`. Earlier rounds are kept unchanged.

Answer inline under each number. Leave one blank if you don't know yet.

## 1. Weighted origin (from v0.2, section B, item 5)

Your words: use the major bounding box. If 70% of the elements are significantly different from the full box, refine with a weighting. Otherwise use the major box. Big features (a spire, a wing) should not move the origin away from the majority.

1. **What counts as "significantly different"?** Proposed: an element is significantly different when its own bounding-box volume is less than **25%** of the full box volume. Is 25% right, or do you want a different number?
2. **Is the 70% a share of the elements (by count) or a share of the volume?** Proposed: by count.
3. **How is the refined origin worked out?** Proposed: a **volume-weighted average** of the element centres. The big parts pull the origin, and a small spire barely moves it. Is that what you mean, or do you want something else?

## 2. Units (from v0.2, section J)

4. **Store the files in inches, and display feet and inches?** Proposed: yes. Quick Detail is also in inches, so the two projects match. Model files would then say `"units": "in"`. Is that right?
5. **Display precision:** nearest 1/8 inch, 1/16 inch, or decimal inches? Proposed: 1/8 inch (for example 3′-0″ or 7′-0 1/2″).

## 3. Table length (from v0.2, section A)

6. The outdoor table is 3 ft × 7 ft. Is 7 ft the **length** and 3 ft the width? Proposed: yes, 7 ft long and 3 ft wide.
