# A helper class to define the schema for updating user information in manage_accounts_api.py. Basically returns this object so that in update user method we can
# easily parse through the data
from pydantic import BaseModel
from typing import Optional

class UserUpdateSchema(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password_hash: Optional[str] = None
    type: Optional[str] = None