/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#008fa0",
          hover: "#007a8a",
          light: "#e6f3f5",
        },
        light: "#e9e9e9",
        "bg-light": "#f4f6f8",
      },
    },
  },
};
