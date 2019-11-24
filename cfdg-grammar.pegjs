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
 = (rule whitespace)+

rule
 = "rule" whitespace float? maybe_whitespace "{" maybe_whitespace commands maybe_whitespace "}"

commands
 = command whitespace commands
 / command

command
 = identifier maybe_whitespace "[" maybe_whitespace parameters maybe_whitespace "]"

parameters
 = (parameter whitespace)* parameter?

parameter
 = "s"          whitespace float // Saturation
 / "saturation" whitespace float
 / "b"          whitespace float // Brightness
 / "brightness" whitespace float
 / "rot"        whitespace float // Rotation
 / "rotate"     whitespace float
 / "x"          whitespace float // Coordinates
 / "y"          whitespace float 
 / "hue"        whitespace float // Hue

float
 = sign? [0-9]+ "." [0-9]*
 / sign? [0-9]* "." [0-9]+
 / sign? int

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