interface Props {
  size?: number
}

export default function ThreadsIcon({ size = 20 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M16.55 7.63C15.58 5.92 14.08 5 12.03 5c-3.23 0-5.28 2.19-5.28 6.96 0 4.78 2.1 7.04 5.34 7.04 2.85 0 4.82-1.68 4.82-4.16 0-2.3-1.73-3.75-4.33-3.75-2.43 0-3.97 1.23-3.97 3.11 0 1.65 1.26 2.78 3.12 2.78 2.78 0 4.66-2.22 4.66-5.37 0-1.58-.28-2.9-.84-3.98Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.76 9.58c2.31.38 4.02 1.34 4.93 2.83"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  )
}
