SS14 Paperwork Editor
=====================

Pretty bare-bones editor/previewer for ss14.

See here `Paperwork Editor <http://bigolmate.github.io/ss14_paperwork_editor`_

I've tried to replicate the in-game markup formatting as much as possible down to how the markup is
being parsed, however due to the differences in how browsers handle font rendering and how it's
implemented in SS14 it will never be exactly the same.

Features:

- includes rendering of all standard paperwork tags (bold, italic, bolditalic, color, head, bullet)
- custom parser based off the one in RobustToolkit
- basic test suite (note color tests fail when run from cli as it requires browser api)

Known Issues:

- this viewer will display characters not supported by SS14, I *think* this is because of browser
  default fallback fonts but I'm not entirely sure.
- there is currently an incorrect rendering in the case of some interleaved & incorrectly closed tags 
  this shouldn't be an issue for most people. But for example
  ``[bold]bold[italic]italic[/bold]uh??[/italic]huh??`` is displayed differently ingame than it is on
  this viewer.