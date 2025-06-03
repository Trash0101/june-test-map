<template>
  <header class="header">
    <div class="header__container">
      <div class="header__content">
        <div class="header__logo-wrapper">
          <img alt="Logo" class="header__logo" src="@/assets/logo.svg" width="32" height="32" />
          <span class="header__title">GeoJSON Test</span>
        </div>
        <nav class="nav"/>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
$dark-bg-primary: #121212;
$dark-bg-secondary: #1e1e1e;
$dark-bg-tertiary: #2d2d2d;
$dark-text-primary: #ffffff;
$dark-text-secondary: rgba(255, 255, 255, 0.7);
$dark-text-disabled: rgba(255, 255, 255, 0.5);
$dark-divider: rgba(255, 255, 255, 0.12);
$accent-color: hsla(160, 100%, 37%, 1);
$accent-light: hsl(160, 98%, 46%);
$accent-dark: hsla(160, 100%, 37%, 0.2);
$error-color: #cf6679;
$header-height-mobile: 70px;
$header-height-desktop: 80px;
$max-content-width: 1200px;
$breakpoint-mobile: 768px;

.header {
  background-color: $dark-bg-secondary;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  height: $header-height-mobile;

  &__container {
    width: 100%;
    max-width: $max-content-width;
    margin: 0 20px;
    padding: 0 1rem;
  }

  &__content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: $header-height-mobile;
  }

  &__logo-wrapper {
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  &__logo {
    display: block;
    margin-right: 1rem;
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 700;
    color: $accent-light;
    display: none;

    @media (min-width: $breakpoint-mobile) {
      display: block;
    }
  }

  @media (min-width: $breakpoint-mobile) {
    height: $header-height-desktop;

    &__content {
      height: $header-height-desktop;
    }
  }
}

.nav {
  position: relative;

  &__toggle {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 30px;
    height: 21px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    z-index: 1100;

    @media (min-width: $breakpoint-mobile) {
      display: none;
    }
  }

  &__toggle-text {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }

  &__toggle-bar {
    height: 3px;
    width: 100%;
    background-color: $dark-text-primary;
    border-radius: 3px;
  }

  &__wrapper {
    display: flex;
    align-items: center;

    @media (max-width: $breakpoint-mobile - 1) {
      position: fixed;
      top: 0;
      right: -100%;
      width: 80%;
      height: 100vh;
      background-color: $dark-bg-secondary;
      flex-direction: column;
      padding: 80px 2rem 2rem;
      transition: right 0.3s ease;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.5);
      justify-content: flex-start;
      align-items: flex-start;

      &--active {
        right: 0;
      }
    }
  }
  &__item {
    margin: 0 0.5rem;

    @media (max-width: $breakpoint-mobile - 1) {
      margin: 0.5rem 0;
      width: 100%;
    }
  }
}
@media (max-width: 480px) {
  .header {
    display: none;
  }
}
</style>
