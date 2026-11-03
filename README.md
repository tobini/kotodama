# Kotodama · 言霊

Juego de tipeo estilo *Typer Shark* para practicar japonés (referencia: JLPT N5).
Los yōkai avanzan hacia el santuario; se destierran escribiendo en romaji la lectura de lo que llevan.

## Uso

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # tests del motor de romaji y de los datos
npm run build   # build estático en dist/
```

## Controles

- Escribí el romaji: la primera tecla fija como objetivo al yōkai más cercano que la acepte.
- `Shift` (o `Retroceso`): soltar el objetivo actual.
- `Enter`: kamikaze (神風), cuando la barra está llena: destierra a todos los yōkai en pantalla.
- `Esc`: pausa con volúmenes (`Q` en pausa termina la partida).

En desarrollo, `?oleada=N` en la URL arranca la partida en esa oleada (útil para probar jefes y enemigos).

## Estructura

- `src/romaji/`: motor de romaji. Acepta todas las variantes válidas (shi/si, tsu/tu, っ duplicando consonante, ん como n/nn, ー como guion o vocal).
- `src/data/`: contenido de estudio (`StudyItem`): kana, vocabulario en kana y kanji N5. Criterio: si una palabra lleva kanji que no son N5, se escribe en kana (como en el examen).
- `src/audio/`: efectos, música generativa (escala miyako-bushi) y voz japonesa del navegador.
- `src/game/`: loop del juego, enemigos, efectos y dibujo en canvas.
- `src/progress/`: estadísticas por ítem (cajas tipo Leitner, en localStorage) y campaña. Para agregar niveles, sumarlos a `LEVELS` en `campaign.ts`.
- `src/ui/`: menú (campaña, práctica libre, progreso), pausa y resultados (DOM).
