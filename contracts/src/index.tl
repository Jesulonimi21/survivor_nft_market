#pragma version 8

struct ArtistData:
    app: int
end


struct ArtistByteCode:
    artist_approval: bytes[900]
    artist_clear: bytes[4]
end
const int NORMAL_STATE = 0


if Txn.ApplicationID == 0:
    app_global_put("admin", Txn.Sender)
    app_global_put("contract_state", NORMAL_STATE)
    app_global_put("gas_station_id", btoi(Txn.ApplicationArgs[0]))
    app_global_put("gas_station_address", Txn.ApplicationArgs[1])
    exit(1)
end


switch Txn.OnCompletion:
    NoOp: main
    OptIn: opt_in
    CloseOut: close_out
    UpdateApplication: update_app
    DeleteApplication: delete_app
end




block main:
    switch Txn.ApplicationArgs[0]:
        "create_nft": create_nft
        "assets_opt_in": assets_opt_in
        else: fail
   end
    #0 = "create_nft" 1 = asset_name 
    block create_nft:
        assert(Global.GroupSize == 2, "Maximum number of txns must be 2")
        assert(Gtxn[0].Receiver == Global.CurrentApplicationAddress, "Receiver must be the admin")
        assert(Gtxn[0].Amount == 1000000, "Must send 1 algo to the Contract address")
        assert(Txn.Sender == app_global_get("admin"))
        bytes admin = app_global_get("admin")
        box<ArtistByteCode> artist_teal_map = OpenBox(Global.CurrentApplicationAddress)
        bytes approval = artist_teal_map.artist_approval
        bytes clear = artist_teal_map.artist_clear
        bytes asset_owner = Gtxn[0].Sender 
        int total_issuance = 1
        int decimals = 3 
        bytes asset_name = Txn.ApplicationArgs[1]
        bytes metadata_hash = Txn.ApplicationArgs[2]
        bytes asset_url = Txn.ApplicationArgs[3]
        bytes unit_name = Txn.ApplicationArgs[4]
        int price = btoi(Txn.ApplicationArgs[5])
        int is_fractional_nft = btoi(Txn.ApplicationArgs[6])
        bytes artist = Txn.ApplicationArgs[7]
        int box_exists
        int box_length
        box_exists, box_length = box_len(artist)
        int artist_app = 0
        if box_length == 0:
            # create and fund new contract
            inner_group:
                inner_txn:
                        TypeEnum: Pay
                        Receiver: app_global_get("gas_station_address")
                        Amount: 500000
                        Fee: 0
                end
                inner_txn:
                    TypeEnum: Appl
                    ApprovalProgram: approval
                    ClearStateProgram: clear
                    OnCompletion: NoOp
                    Applications[0]: app_global_get("gas_station_id")
                    GlobalNumUint: 3
                    GlobalNumByteSlice: 2
                    ApplicationArgs[0]: artist
                    ApplicationArgs[1]: itob(app_global_get("gas_station_id"))
                    Accounts[0]: Global.CurrentApplicationAddress
                    Accounts[1]: app_global_get("gas_station_address")
                    Fee: 0
                end
            end
            artist_app = gitxn(1, CreatedApplicationID) 
            box<ArtistData> artist_app_map = CreateBox(artist)
            artist_app_map.app = artist_app
        else:
            box<ArtistData> artist_app_map_ = OpenBox(artist)
            artist_app = artist_app_map_.app
        end
    
        bytes artist_app_address
        _, artist_app_address = app_params_get(AppAddress, artist_app)
      
        inner_group:
            inner_txn:
                    TypeEnum: Pay
                    Receiver: artist_app_address
                    Amount: 1000000
                    Fee: 0
            end
            inner_txn:
                TypeEnum: Appl
                OnCompletion: NoOp
                ApplicationID: artist_app
                ApplicationArgs[0]: "create_nft"
                ApplicationArgs[1]: asset_name
                ApplicationArgs[2]: metadata_hash
                ApplicationArgs[3]: asset_url
                ApplicationArgs[4]: unit_name
                ApplicationArgs[5]: itob(price)
                ApplicationArgs[6]: itob(is_fractional_nft)
                ApplicationArgs[7]: artist
                Fee: 0
            end
        end
        exit(1)
    end

   block fail:
    exit(0)
   end


    block assets_opt_in:
        box<ArtistByteCode> artist_teal_map = CreateBox(Global.CurrentApplicationAddress)
        artist_teal_map.artist_approval = Txn.ApplicationArgs[1]
        artist_teal_map.artist_clear = Txn.ApplicationArgs[2]
        exit(1)
   end
end


block opt_in:
    exit(1)
end

block close_out:
    exit(1)
end

block update_app:
    if Txn.Sender == app_global_get("admin"):
        exit(1)
    end

    exit(0)
end


block delete_app:
    if Txn.Sender == app_global_get("admin"):
        exit(1)
    end

    exit(0)
end