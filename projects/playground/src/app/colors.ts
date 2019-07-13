
interface IColors {
    bg: string;
    bg1: string;
    highlight: string;
    fg: string;
    fg8: string;
    fg9: string;
    fg10: string;
    fg11: string;
    fg12: string;
}

export const bg = (hex: string) => `${hex}-bg`;
export const fg = (hex: string) => `${hex}-fg`;

export const colors: IColors = {
    bg: '#272822',
    bg1: '#33352c',
    highlight: '#1e1d1e',
    fg: '#FFFFFF',
    fg8: '#ff5f00',
    fg9: '#ff00ff',
    fg10: '#0087d7',
    fg11: '#008000',
    fg12: '#9abd06',
};

export const defaultStyles = () => ({
    bg: colors.bg,
    fg: fg(colors.fg),
    focus: {
      border: {
        bg: colors.bg,
        fg: colors.fg9,
      },
    },
    border: {
      bg: colors.bg,
      fg: fg(colors.fg10),
    },
    scrollbar: {
      bg: colors.bg,
      fg: bg(colors.fg10),
    },
  });
