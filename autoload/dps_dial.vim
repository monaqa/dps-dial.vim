function dps_dial#operator_increment_normal(type, ...)
  call denops#request("dial", "operatorNormal", [a:type, "increment"])
endfunction

function dps_dial#operator_decrement_normal(type, ...)
  call denops#request("dial", "operatorNormal", [a:type, "decrement"])
endfunction

function dps_dial#operator_increment_visual(type, ...)
  call denops#request("dial", "operatorVisual", [a:type, "increment", v:false])
endfunction

function dps_dial#operator_decrement_visual(type, ...)
  call denops#request("dial", "operatorVisual", [a:type, "decrement", v:false])
endfunction

function dps_dial#operator_increment_gvisual(type, ...)
  call denops#request("dial", "operatorVisual", [a:type, "increment", v:true])
endfunction

function dps_dial#operator_decrement_gvisual(type, ...)
  call denops#request("dial", "operatorVisual", [a:type, "decrement", v:true])
endfunction

function dps_dial#register_callback(func)
  return denops#callback#register(a:func, {'once': v:false})
endfunction
