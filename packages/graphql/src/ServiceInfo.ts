/**
 * ServiceInfo allows registration of services via ResolverService using a different name.
 *
 * By default, ResolverService.registerService() will register a service based on its class name.
 *
 * It is sometimes useful to override the class name. For example, "MongoSecurityService" is
 * registered as "SecurityService".
 */
export interface ServiceInfo {
  /**
   *
   * Get service info object.
   *
   * @return {{serviceName: string}}
   */
  info (): { serviceName: string }
}
