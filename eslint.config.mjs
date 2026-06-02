import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

const nextConfig = Array.isArray(nextCoreWebVitals)
  ? nextCoreWebVitals
  : [nextCoreWebVitals]

const eslintConfig = [
  {
    ignores: [
      "public/tinymce/**",
      "functions/lib/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...nextConfig,
]

export default eslintConfig
