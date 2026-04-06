
import asyncio
from unittest.mock import AsyncMock, patch
import uuid
import sys
import os
from datetime import timedelta

# Add api to path
sys.path.append(os.path.join(os.getcwd(), "api"))

from models.user import User
from core.enums import UserRole
from core.roles import Role
from dependencies.auth import get_current_user, has_role
from core.security import create_access_token, decode_token
from fastapi import HTTPException

async def test_auth_logic():
    print("Testing Auth Logic...")
    
    user_id = uuid.uuid4()
    mock_user = User(id=user_id, username="test", role=UserRole.MANAGER)
    
    # 1. Test Token Creation (New requirement)
    print("1. Testing Token Creation...")
    token = create_access_token(
        subject=user_id, 
        claims={"role": "manager"}
    )
    payload = decode_token(token)
    
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "manager"
    print("   -> Success: Token contains correct sub and role.")

    # 2. Test get_current_user
    print("2. Testing get_current_user...")
    
    mock_db = AsyncMock()
    
    with patch("dependencies.auth.jwt.decode") as mock_decode, \
         patch("dependencies.auth.UserRepository") as MockRepo:
        
        # Setup Mock Repo
        mock_repo_instance = AsyncMock()
        MockRepo.return_value = mock_repo_instance
        mock_repo_instance.get_by_id.return_value = mock_user
        
        # Setup Token Decode (Simulation of what valid token provides)
        mock_decode.return_value = {"sub": str(user_id), "role": "manager"}
        
        user = await get_current_user(db=mock_db, token="valid_token")
        
        assert user.id == user_id
        # Manager role maps to ROLE_EVENTO
        assert Role.ROLE_EVENTO in user.permissions
        print("   -> Success: User retrieved from DB using ID from token.")

    # 3. Test has_role
    print("3. Testing has_role...")
    
    dependency = has_role(Role.ROLE_EVENTO)
    await dependency(user)
    print("   -> Success: User has ROLE_EVENTO.")

if __name__ == "__main__":
    asyncio.run(test_auth_logic())
