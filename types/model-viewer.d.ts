/* eslint-disable @typescript-eslint/no-empty-object-type */
declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        ar?: boolean | string;
        'ar-modes'?: string;
        'ar-scale'?: string;
        'ar-placement'?: string;
        'camera-controls'?: boolean | string;
        'auto-rotate'?: boolean | string;
        'auto-rotate-delay'?: string;
        'rotation-per-second'?: string;
        'shadow-intensity'?: string;
        'shadow-softness'?: string;
        autoplay?: boolean | string;
        'animation-name'?: string;
        'animation-crossfade-duration'?: string;
        'environment-image'?: string;
        'skybox-image'?: string;
        exposure?: string;
        poster?: string;
        loading?: 'auto' | 'lazy' | 'eager';
        reveal?: 'auto' | 'interaction' | 'manual';
        'camera-orbit'?: string;
        'min-camera-orbit'?: string;
        'max-camera-orbit'?: string;
        'camera-target'?: string;
        'field-of-view'?: string;
        'min-field-of-view'?: string;
        'max-field-of-view'?: string;
        'interaction-prompt'?: string;
        'interaction-prompt-style'?: string;
        'interaction-prompt-threshold'?: string;
        'touch-action'?: string;
        'disable-zoom'?: boolean | string;
        'disable-pan'?: boolean | string;
        'disable-tap'?: boolean | string;
        'ios-src'?: string;
        xr?: boolean | string;
        'xr-environment'?: boolean | string;
        'tone-mapping'?: string;
        'scale'?: string;
        'bounds'?: string;
        'interpolation-decay'?: string;
      },
      HTMLElement
    >;
  }
}
