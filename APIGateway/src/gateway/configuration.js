let registry;
export const setRegistry = (value) => {
  registry = value;
};
export const getRegistry = () => registry;
export const settings = () => registry?.getSettings();
export const identityTarget = () => {
  const service = registry?.getService("identity");
  return service?.enabled
    ? service.target
    : registry
      ? null
      : process.env.IDENTITY_SERVICE_URL;
};
