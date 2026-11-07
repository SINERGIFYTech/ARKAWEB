// fetch con límite de tiempo para las llamadas a Supabase DESDE EL SERVIDOR.
// Sin esto, si Supabase no responde (proyecto pausado, caída) cada consulta
// espera indefinidamente y la página se queda colgada hasta que la plataforma
// mata la función. Con el límite, la consulta falla a los pocos segundos y la
// app puede mostrar un error en vez de congelarse. 9 s deja margen bajo el
// límite de 10 s de las funciones serverless de Netlify.
export function timeoutFetch(ms = 9000): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    const outer = init?.signal;
    if (outer) {
      if (outer.aborted) controller.abort();
      else outer.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}
