# Plan: Redesigning the Add Pattern Menu

Refactor the "Add Pattern" menu to use a multi-column, scalable layout that maximizes screen real estate and reduces scrolling.

## Phase 1: Grid & Column Layout
Replace the current single-column list with a horizontally-wrapped category grid.

- **Container Styling**: Update `.add-pattern-menu` to use `display: flex; flex-wrap: wrap; gap: 20px; padding: 16px; width: 600px; max-height: 80vh; overflow-y: auto;`.
- **Category Columns**: Each `menu-category` and its associated `menu-item`s will be grouped into a `menu-column` div.
- **Column Sizing**: Give each `menu-column` a `min-width: 160px; flex: 1 1 0;` to ensure they distribute evenly across the available width.

## Phase 2: Visual Grouping
- **Category Headers**: Distinct headers with bottom borders to separate logical groups.
- **Item Cards**: Consider compact, icon-heavy cards for each pattern to fit more items per column.

## Phase 3: Mobile Adaptation
- **Media Query**: At `< 800px`, the menu will transition to `flex-direction: column; width: calc(100vw - 32px);`.
- **Scrolling**: Ensure the entire menu is scrollable on smaller screens.

## Phase 4: Future Scalability (Roadmap)
As the number of patterns grows towards 100+, the following features will be added:

- **Search Bar**: A sticky input at the top of the menu to filter items across all categories.
- **Recently Used**: A dedicated column for the top 5 most frequent selections.
- **Favorites**: Ability to star patterns to keep them at the top of their respective columns.
- **Category Filtering**: A sidebar or tab system to show one category at a time if the total count exceeds 200+.

## Phase 5: Reminders
- Remember to update `js/main.js`'s `renderPatternMenu` to generate the new `menu-column` wrappers.
- Remind the user about this plan whenever discussing "Add Pattern" UI changes.
