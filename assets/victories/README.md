# Perfect-run sprite sheets

Created with the built-in ImageGen tool on 2026-10-28. These are generated fan-art
depictions, not screenshots or assets extracted from the referenced productions.
Characters and names belong to their respective owners; no affiliation is implied.

Each PNG contains four frames in a 2 × 2 grid, in reading order. Outputs are
1254 × 1254 pixels (627 × 627 per frame) with transparency; the original tool
outputs were copied into the project without editing. CSS displays one cell at a
time at 150 × 150, and captions are real accessible HTML, not baked into images.

| File | Character | Action |
| --- | --- | --- |
| `tech.png` | Clippy | Pops up, shrugs, and disappears |
| `rx.png` | Morpheus | Presents two pills and nods |
| `flat.png` | Ron Swanson | Assembles a chair |
| `rock.png` | Hank Schrader | Raises a mineral and corrects you |
| `garden.png` | Audrey II | Grows, opens its jaws, and bites the score |

Five separate calls used `transparent_background: true`, no reference images,
and the following shared prompt, with the corresponding subject paragraph below
inserted at `{subject}`. Requested size was 1024 × 1024; the tool returned the
larger square dimensions above. No external image calls occur during gameplay.

## Shared prompt

```text
Create a production game sprite sheet, not a mockup. Exactly FOUR animation frames in a 2 by 2 grid of equal square cells on a 1024x1024 transparent canvas, each cell 512x512. No visible grid, labels, typography, letters, numbers, borders or watermark. {subject} All four frames must have the same character scale and baseline, each centered entirely within its own cell with 40px safe margins. Handcrafted 1990s Game Boy pixel art, intentionally chunky crisp square pixels, very limited palette ONLY deep green #29452c and light green #a8ba79 plus one midtone #708950, no black, white or other colors, no antialiasing or gradients. Strong recognizable character likeness and readable expression at tiny size, charming retro game secret ending. The four poses in reading order must follow the requested action. Transparent negative space. Do not draw a handheld console or other UI.
```

## Subject paragraphs

**Tech**

```text
Clippy, the familiar anthropomorphic bent paperclip office assistant, with big expressive eyes and raised wire eyebrows. Four frames: 1 peeking up from bottom edge, 2 fully visible friendly raised eyebrows, 3 resigned drooping eyebrows and shrug-like wire bend, 4 sinking almost entirely below bottom edge.
```

**Rx**

```text
Morpheus from The Matrix, recognizable bald Black man with small round black sunglasses, serious calm face, black high-collar coat. Waist-up seated. Both open hands presented toward viewer, one capsule in each hand. Four frames: 1 calm with hands lowered, 2 both hands open raised showing two capsules distinguished by one striped and one solid, 3 approving downward nod with hands still extended, 4 returning to dignified pose. No weapons.
```

**Flat**

```text
Ron Swanson from Parks and Recreation, recognizable stocky middle-aged man, thick side-parted hair and thick dark mustache, short-sleeve collared shirt. Beside him a simple wooden chair. Four frames: 1 holding two wooden chair parts next to unfinished chair, 2 putting chair back in place, 3 finished chair beside him and hands on hips, 4 proud deadpan expression beside finished chair. Show whole character and chair, clear simple silhouettes.
```

**Rock**

```text
Hank Schrader from Breaking Bad, recognizable stocky bald middle-aged man with heavy brow, square jaw, short-sleeve patterned casual shirt, holding a faceted mineral specimen at chest height. Four frames: 1 neutral holding specimen, 2 raising specimen and opening mouth to indignantly explain, 3 emphatic open mouth and raised brow still holding specimen, 4 satisfied stern face with specimen proudly displayed. No weapons.
```

**Garden**

```text
Audrey II from Little Shop of Horrors, recognizable giant carnivorous plant with a bulbous flytrap head, thick lips, pointed teeth and curling leafy stem growing from a flowerpot. Four frames: 1 small closed mouth low in pot, 2 tall sprouting stem, 3 large head leaning to the right with mouth wide open ready to bite, 4 jaws snapped shut with satisfied expression and a tiny leaf bouncing. No blood, no text.
```
