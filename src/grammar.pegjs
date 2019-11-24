start
  = block*

block
  = startshape
  / whitespace
  / shape

startshape
 = "startshape" whitespace identifier

shape
 = "shape" whitespace identifier maybe_whitespace "{" maybe_whitespace commands maybe_whitespace "}"
 / "shape" whitespace identifier whitespace rules

rules
 = (rule whitespace)* rule?

rule
 = "rule" whitespace float? maybe_whitespace "{" maybe_whitespace commands maybe_whitespace "}"

commands
 = (command whitespace)* command?

command_block
 = "{" maybe_whitespace commands maybe_whitespace "}"
 / command

command
 = identifier maybe_whitespace "[" maybe_whitespace parameters maybe_whitespace "]"
 / loop

loop
 = "loop" whitespace int maybe_whitespace "[" maybe_whitespace parameters maybe_whitespace "]" maybe_whitespace command_block

parameters
 = (parameter whitespace)* parameter?

parameter
 = "sat"        whitespace float // Saturation
 / "saturation" whitespace float
 / "b"          whitespace float // Brightness
 / "brightness" whitespace float
 / "r"          whitespace float // Rotation
 / "rotate"     whitespace float
 / "x"          whitespace float // Coordinates
 / "y"          whitespace float 
 / "hue"        whitespace float // Hue
 / "flip"       whitespace float // Flip
 / "s"          whitespace float // Size
 / "size"       whitespace float
 / "a"          whitespace float // Alpha
 / "alpha"      whitespace float

float
 = sign? [0-9]* "."? [0-9]*

sign
 = "+"
 / "-"

int
 = [0-9]+

maybe_whitespace
 = whitespace?

whitespace
 = [ \t\r\n]+

identifier
 = ([a-zA-Z][_a-zA-Z0-9]*)