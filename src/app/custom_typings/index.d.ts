/** 
 * For loading images via webpack.
 * https://webpack.js.org/guides/asset-management/#setup
 */
declare module "*.jpg" {
    const value: any;
    export default value;
}