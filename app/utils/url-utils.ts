export const getUrlParams = () => new URLSearchParams(window.location.search);

export const shouldCleanupSubscription = (): boolean => {
  const params = getUrlParams();
  return params.get('cleanup') === 'true' && params.get('success') === 'true';
};

export const removeCleanupParams = (): void => {
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.delete('cleanup');
  window.history.replaceState({}, document.title, newUrl.toString());
};

// Note: This should be replaced with router.push() in components
export const getResumePagePath = (): string => {
  return '/resume/new';
};