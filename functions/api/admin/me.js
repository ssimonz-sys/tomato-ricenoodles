import {guard} from '../../../lib/auth.js';
import {send} from '../../../lib/common.js';
export async function onRequestGet(context){const result=await guard(context);if(result.failed)return result.failed;return send({authenticated:true,csrf:result.session.csrf_token});}
