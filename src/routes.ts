import type { RouteProps } from 'react-router';

export const addRoute: RouteProps = {
  path: '/addCloudCluster'
}

export const getAddUrl = () => addRoute.path.toString();
