function dps_dial#operator_increment(type, ...)
  call denops#request("dial", "operator", [a:type, "increment"])
endfunction

function dps_dial#operator_decrement(type, ...)
  call denops#request("dial", "operator", [a:type, "decrement"])
endfunction
