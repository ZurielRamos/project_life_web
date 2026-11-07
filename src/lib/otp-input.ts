/**
 * Campo OTP de N casillas: avance automático, borrado hacia atrás, flechas,
 * pegado de código completo y autocompletado del SMS/WhatsApp
 * (`autocomplete="one-time-code"`). Llama a `onComplete` al llenar la última.
 */

export interface OtpInputApi {
  /** Código actual (solo dígitos). */
  getCode(): string;
  /** Vacía las casillas y enfoca la primera. */
  reset(): void;
  focus(): void;
  setDisabled(disabled: boolean): void;
  /** Marca/desmarca el estado de error (borde rojo + sacudida). */
  setInvalid(invalid: boolean): void;
}

export function otpInputHtml(length = 6): string {
  const cells = Array.from(
    { length },
    (_, i) =>
      `<input class="ca-otp-cell" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="${length}" autocomplete="${
        i === 0 ? 'one-time-code' : 'off'
      }" aria-label="Dígito ${i + 1} de ${length}" data-otp-cell />`,
  ).join('');
  return `<div class="ca-otp" role="group" aria-label="Código de verificación" data-otp>${cells}</div>`;
}

export function initOtpInput(
  root: HTMLElement,
  onComplete: (code: string) => void,
  length = 6,
): OtpInputApi {
  const wrap = root.querySelector<HTMLElement>('[data-otp]')!;
  const cells = Array.from(
    wrap.querySelectorAll<HTMLInputElement>('[data-otp-cell]'),
  );

  const getCode = () => cells.map((c) => c.value).join('');

  function maybeComplete() {
    const code = getCode();
    if (code.length === length && /^\d+$/.test(code)) onComplete(code);
  }

  /** Reparte dígitos desde la casilla `from` (pegado / autocompletado). */
  function fill(from: number, digits: string) {
    let i = from;
    for (const d of digits) {
      if (i >= length) break;
      cells[i].value = d;
      i += 1;
    }
    cells[Math.min(i, length - 1)].focus();
    maybeComplete();
  }

  cells.forEach((cell, i) => {
    cell.addEventListener('input', () => {
      setInvalid(false);
      const digits = cell.value.replace(/\D/g, '');
      if (!digits) {
        cell.value = '';
        return;
      }
      // Más de un dígito: autocompletado del sistema o texto pegado.
      cell.value = '';
      fill(i, digits);
    });

    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (cell.value) {
          cell.value = '';
        } else if (i > 0) {
          cells[i - 1].value = '';
          cells[i - 1].focus();
        }
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' && i > 0) {
        e.preventDefault();
        cells[i - 1].focus();
      } else if (e.key === 'ArrowRight' && i < length - 1) {
        e.preventDefault();
        cells[i + 1].focus();
      }
    });

    cell.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text') ?? '';
      const digits = text.replace(/\D/g, '');
      if (digits) fill(i, digits);
    });

    // Seleccionar el contenido al enfocar para reemplazarlo al escribir.
    cell.addEventListener('focus', () => cell.select());
  });

  function setInvalid(invalid: boolean) {
    wrap.classList.toggle('invalid', invalid);
    if (invalid) {
      // Reinicia la animación aunque ya estuviera marcada.
      wrap.classList.remove('shake');
      void wrap.offsetWidth;
      wrap.classList.add('shake');
    } else {
      wrap.classList.remove('shake');
    }
  }

  return {
    getCode,
    reset() {
      cells.forEach((c) => (c.value = ''));
      setInvalid(false);
      cells[0].focus();
    },
    focus() {
      (cells.find((c) => !c.value) ?? cells[0]).focus();
    },
    setDisabled(disabled) {
      cells.forEach((c) => (c.disabled = disabled));
    },
    setInvalid,
  };
}
